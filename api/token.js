import https from "https";

function b64ToPem(b64) {
  if (!b64) throw new Error("Missing base64 cert/key");
  return Buffer.from(b64, "base64").toString("utf8");
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const tokenUrl = process.env.CORA_TOKEN_URL;
    const clientId = process.env.CORA_CLIENT_ID;

    if (!tokenUrl || !clientId) {
      return res.status(500).json({ 
        error: "Missing CORA_TOKEN_URL or CORA_CLIENT_ID",
        env: { tokenUrl: !!tokenUrl, clientId: !!clientId }
      });
    }

    console.log("Token URL from env:", tokenUrl); // Log para debug

    const cert = b64ToPem(process.env.CORA_CERT_PEM_B64);
    const key = b64ToPem(process.env.CORA_KEY_PEM_B64);

    const postData = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
    }).toString();

    const url = new URL(tokenUrl);
    
    // IMPORTANTE: Usar EXATAMENTE o hostname e path da URL
    const options = {
      method: "POST",
      hostname: url.hostname,
      path: url.pathname, // Isso deve ser "/oauth/token"
      cert,
      key,
      rejectUnauthorized: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    console.log("Requesting:", url.hostname + url.pathname);

    const coraResp = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => {
          console.log("Token response status:", resp.statusCode);
          resolve({
            status: resp.statusCode,
            body: data,
          });
        });
      });

      r.on("error", (err) => {
        console.error("Request error:", err);
        reject(err);
      });
      
      r.write(postData);
      r.end();
    });

    // Tenta parsear o JSON para garantir
    try {
      const jsonBody = JSON.parse(coraResp.body);
      return res.status(coraResp.status).json(jsonBody);
    } catch {
      // Se não for JSON, retorna como está
      return res.status(coraResp.status).send(coraResp.body);
    }

  } catch (err) {
    console.error("Token error:", err);
    return res.status(500).json({
      error: "token_error",
      detail: err.message,
    });
  }
}
