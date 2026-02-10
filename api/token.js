import https from "https";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const tokenUrl = process.env.CORA_TOKEN_URL;
    const clientId = process.env.CORA_CLIENT_ID;

    const certPem = Buffer.from(process.env.CORA_CERT_PEM_B64 || "", "base64").toString("utf8");
    const keyPem = Buffer.from(process.env.CORA_KEY_PEM_B64 || "", "base64").toString("utf8");

    if (!tokenUrl || !clientId || !certPem || !keyPem) {
      return res.status(500).json({
        error: "Missing env vars",
        tokenUrl: !!tokenUrl,
        clientId: !!clientId,
        cert: !!process.env.CORA_CERT_PEM_B64,
        key: !!process.env.CORA_KEY_PEM_B64
      });
    }

    const agent = new https.Agent({ cert: certPem, key: keyPem });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId
    }).toString();

    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      agent
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "proxy_error", details: e?.message || String(e) });
  }
}
