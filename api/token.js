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

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Apenas POST permitido
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Pegar variáveis de ambiente
    const tokenUrl = process.env.CORA_TOKEN_URL;
    const clientId = process.env.CORA_CLIENT_ID;

    // Validar variáveis
    if (!tokenUrl || !clientId) {
      console.error("Missing env vars:", { 
        tokenUrl: !!tokenUrl, 
        clientId: !!clientId 
      });
      return res.status(500).json({ 
        error: "Missing CORA_TOKEN_URL or CORA_CLIENT_ID" 
      });
    }

    // Converter certificado e chave
    let cert, key;
    try {
      cert = b64ToPem(process.env.CORA_CERT_PEM_B64);
      key = b64ToPem(process.env.CORA_KEY_PEM_B64);
    } catch (e) {
      console.error("Error converting cert/key:", e);
      return res.status(500).json({ 
        error: "Invalid certificate or key format" 
      });
    }

    // Preparar dados do token
    const postData = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
    }).toString();

    const url = new URL(tokenUrl);

    // Opções da requisição
    const options = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      cert: cert,
      key: key,
      rejectUnauthorized: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    console.log("Requesting token from:", url.hostname + url.pathname);

    // Fazer requisição para Cora
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

    // Log response status
    console.log("Token response status:", response.status);

    // Tentar parsear o body para ver se é JSON
    let responseBody = response.body;
    try {
      // Se for string, tenta parsear para garantir que é JSON válido
      if (typeof response.body === 'string') {
        JSON.parse(response.body);
      }
    } catch (e) {
      // Se não for JSON, mantém como string
      console.log("Response is not JSON");
    }

    // Retornar resposta
    res.status(response.status).send(response.body);

  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({
      error: "token_generation_failed",
      message: error.message,
    });
  }
}
