import https from "https";

function b64ToPem(b64) {
  if (!b64) throw new Error("Missing base64 cert/key");
  // Converte Base64 para string PEM
  return Buffer.from(b64, "base64").toString("utf8");
}

export default async function handler(req, res) {
  // Configurar CORS se necessário
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Configurações do ambiente
    const tokenUrl = process.env.CORA_TOKEN_URL; // https://matls-clients.api.cora.com.br/oauth/token
    const clientId = process.env.CORA_CLIENT_ID;

    if (!tokenUrl || !clientId) {
      console.error("Missing env vars:", { tokenUrl: !!tokenUrl, clientId: !!clientId });
      return res.status(500).json({ error: "Missing CORA_TOKEN_URL or CORA_CLIENT_ID" });
    }

    // Converte certificado e chave de Base64 para PEM
    let cert, key;
    try {
      cert = b64ToPem(process.env.CORA_CERT_PEM_B64);
      key = b64ToPem(process.env.CORA_KEY_PEM_B64);
    } catch (e) {
      console.error("Error converting cert/key:", e);
      return res.status(500).json({ error: "Invalid certificate or key format" });
    }

    // Dados para o token
    const postData = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
    }).toString();

    const url = new URL(tokenUrl);

    const options = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      cert: cert,
      key: key,
      rejectUnauthorized: true, // Importante para produção
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    console.log("Requesting token from:", url.hostname + url.pathname);

    // Faz a requisição para a Cora
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on("error", (error) => {
        console.error("Request error:", error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    // Log para debug (remova em produção)
    console.log("Token response status:", response.status);
    
    // Retorna a resposta para o cliente
    res.status(response.status).send(response.body);

  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({
      error: "token_generation_failed",
      message: error.message,
    });
  }
}
