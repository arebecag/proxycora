// /api/cora-proxy.js - Endpoint proxy para API da Cora
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

    const base = process.env.CORA_API_URL;
    const cert = b64ToBuf(process.env.CORA_CERT_PEM_B64);
    const key = b64ToBuf(process.env.CORA_KEY_PEM_B64);

    if (!base || !cert || !key) {
      return res.status(500).json({ error: "Missing env vars" });
    }

    const url = new URL(base + path);

    // Headers importantes
    const headers = {
      Authorization: req.headers.authorization,
      "Content-Type": req.headers["content-type"] || "application/json",
    };

    // Idempotency-Key é OBRIGATÓRIO para POST de boletos
    if (req.method === "POST" && !req.headers["idempotency-key"]) {
      return res.status(400).json({ 
        error: "Idempotency-Key header is required for POST requests" 
      });
    }

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

    console.log(`Proxying to: ${base + path}`); // Log para debug

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

      if (req.method !== "GET" && req.body) {
        const bodyData = typeof req.body === 'object' 
          ? JSON.stringify(req.body) 
          : req.body;
        r.write(bodyData);
      }

      r.end();
    });

    res.status(coraResp.status || 500);
    return res.send(coraResp.body);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({
      error: "proxy_error",
      detail: err.message,
    });
  }
}
