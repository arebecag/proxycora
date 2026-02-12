import https from "https";

function b64ToBuf(b64) {
  if (!b64) return null;
  // aceita "-----BEGIN" (pem direto) ou base64
  if (b64.includes("BEGIN")) return Buffer.from(b64, "utf8");
  return Buffer.from(b64, "base64");
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

function requestHttps(url, { method, headers, body, cert, key }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);

    const options = {
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers,
      cert,
      key,
    };

    const r = https.request(options, (res) => {
      let out = "";
      res.on("data", (c) => (out += c));
      res.on("end", () =>
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: out,
        })
      );
    });

    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

export default async function handler(req, res) {
  try {
    const base =
      (process.env.CORA_API_URL || "https://matls-clients.api.cora.com.br").replace(/\/$/, "");

    const path = req.query.path;
    if (!path || typeof path !== "string" || !path.startsWith("/")) {
      return res.status(400).json({
        error: "missing_path",
        message: "Use /api/cora?path=/v2/me (path deve começar com /)",
      });
    }

    // mTLS
    const cert = b64ToBuf(process.env.CORA_CERT_PEM_B64);
    const key = b64ToBuf(process.env.CORA_KEY_PEM_B64);
    if (!cert || !key) {
      return res.status(500).json({
        error: "missing_mtls",
        message: "Faltam CORA_CERT_PEM_B64 e/ou CORA_KEY_PEM_B64 nas env vars",
      });
    }

    // Usa Authorization que vem do cliente (SEMPRE)
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({
        error: "missing_authorization",
        message: "Envie header Authorization: Bearer <token>",
      });
    }

    const method = (req.method || "GET").toUpperCase();

    // repassa body em POST/PUT/PATCH
    const bodyText = ["POST", "PUT", "PATCH"].includes(method) ? await readBody(req) : null;

    const headers = {
      Authorization: auth,
      "Content-Type": req.headers["content-type"] || "application/json",
      // opcional: idempotency
      ...(req.headers["idempotency-key"] ? { "Idempotency-Key": req.headers["idempotency-key"] } : {}),
    };

    const targetUrl = base + path;

    const resp = await requestHttps(targetUrl, {
      method,
      headers,
      body: bodyText,
      cert,
      key,
    });

    // devolve do jeito que veio
    res.status(resp.status);
    const ct = resp.headers["content-type"];
    if (ct) res.setHeader("Content-Type", ct);
    return res.send(resp.body);
  } catch (e) {
    return res.status(500).json({
      error: "proxy_error",
      message: e?.message || String(e),
    });
  }
}
