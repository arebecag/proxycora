import https from "https";

function b64ToBuf(b64) {
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}

export default async function handler(req, res) {
  try {
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: "Missing path param" });
    }

    const base = process.env.CORA_API_URL; // https://matls-clients.api.cora.com.br
    const cert = b64ToBuf(process.env.CORA_CERT_PEM_B64);
    const key = b64ToBuf(process.env.CORA_KEY_PEM_B64);

    if (!base || !cert || !key) {
      return res.status(500).json({ error: "Missing env vars" });
    }

    const url = new URL(base + path);

    // 🔥 FILTRA HEADERS IMPORTANTES
    const headers = {
      Authorization: req.headers.authorization,
      "Content-Type": req.headers["content-type"] || "application/json",
    };

    // só envia idempotency se existir
    if (req.headers["idempotency-key"]) {
      headers["Idempotency-Key"] = req.headers["idempotency-key"];
    }

    const options = {
      method: req.method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers,
      cert,
      key,
      rejectUnauthorized: true,
    };

    const coraResp = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () =>
          resolve({
            status: resp.statusCode,
            headers: resp.headers,
            body: data,
          })
        );
      });

      r.on("error", reject);

      if (req.method !== "GET") {
        r.write(JSON.stringify(req.body));
      }

      r.end();
    });

    res.status(coraResp.status || 500);
    return res.send(coraResp.body);

  } catch (err) {
    return res.status(500).json({
      error: "proxy_error",
      detail: err.message,
    });
  }
}
