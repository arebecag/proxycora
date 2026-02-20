import https from "https";

function getPemFromEnv(value) {
  if (!value) return null;
  if (value.includes('-----BEGIN')) {
    return value;
  }
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return value;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const tokenUrl = process.env.CORA_TOKEN_URL;
    const clientId = process.env.CORA_CLIENT_ID;

    if (!tokenUrl || !clientId) {
      return res.status(500).json({ error: "Missing CORA_TOKEN_URL or CORA_CLIENT_ID" });
    }

    const cert = getPemFromEnv(process.env.CORA_CERT_PEM_B64);
    const key = getPemFromEnv(process.env.CORA_KEY_PEM_B64);

    const postData = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
    }).toString();

    const url = new URL(tokenUrl);

    const options = {
      method: "POST",
      hostname: url.hostname,
      path: url.pathname,
      cert,
      key,
      rejectUnauthorized: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const coraResp = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => resolve({ status: resp.statusCode, body: data }));
      });
      r.on("error", reject);
      r.write(postData);
      r.end();
    });

    return res.status(coraResp.status).send(coraResp.body);

  } catch (err) {
    console.error("Erro:", err);
    return res.status(500).json({ error: err.message });
  }
}
