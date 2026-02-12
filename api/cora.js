import https from "https";

function b64ToPem(b64) {
  if (!b64) return null;
  const raw = Buffer.from(b64, "base64").toString("utf8");
  // Se já veio PEM completo, retorna
  if (raw.includes("BEGIN")) return raw;
  // Se veio “cru”, retorna como está (mas o normal é PEM)
  return raw;
}

export default async function handler(req, res) {
  try {
    const CERT = b64ToPem(process.env.CORA_CERT_PEM_B64);
    const KEY = b64ToPem(process.env.CORA_KEY_PEM_B64);

    if (!CERT || !KEY) {
      return res.status(500).json({ error: "missing_cert_or_key" });
    }

    // Base URL (produção por padrão)
    const base = (process.env.CORA_API_URL || "https://matls-clients.api.cora.com.br").replace(/\/$/, "");

    // Monta path do destino: tudo que vier depois de /api/cora
    const urlObj = new URL(req.url, "http://localhost");
    const forwardPath = urlObj.pathname.replace(/^\/api\/cora/, "") || "/";
    const forwardUrl = base + forwardPath + (urlObj.search || "");

    // Lê body (se existir)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyRaw = Buffer.concat(chunks);
    const hasBody = bodyRaw && bodyRaw.length > 0;

    // Monta headers (copiando Authorization e Idempotency-Key)
    const headers = {
      "Content-Type": req.headers["content-type"] || "application/json",
      "Authorization": req.headers["authorization"] || "",
      "Idempotency-Key": req.headers["idempotency-key"] || req.headers["Idempotency-Key"] || ""
    };

    // remove headers vazios
    Object.keys(headers).forEach((k) => {
      if (!headers[k]) delete headers[k];
    });

    const agent = new https.Agent({
      cert: CERT,
      key: KEY,
      rejectUnauthorized: true
    });

    const fetchOpts = {
      method: req.method,
      headers,
      agent
    };

    if (hasBody && req.method !== "GET" && req.method !== "HEAD") {
      fetchOpts.body = bodyRaw;
    }

    const r = await fetch(forwardUrl, fetchOpts);

    const text = await r.text();
    res.status(r.status);

    // repassa content-type se vier
    const ct = r.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);

    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: "proxy_error", message: String(e?.message || e) });
  }
}
