import https from "https";

function b64ToBuffer(b64) {
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: "Missing path parameter" });
    }

    // Configurações
    const apiBase = process.env.CORA_API_URL; // https://matls-api.cora.com.br
    const cert = b64ToBuffer(process.env.CORA_CERT_PEM_B64);
    const key = b64ToBuffer(process.env.CORA_KEY_PEM_B64);

    if (!apiBase || !cert || !key) {
      console.error("Missing API configuration");
      return res.status(500).json({ error: "API not properly configured" });
    }

    const url = new URL(apiBase + path);

    // Headers importantes
    const headers = {
      'Authorization': req.headers.authorization,
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    // Idempotency-Key é OBRIGATÓRIO para POST de boletos
    if (req.method === 'POST' && !req.headers['idempotency-key']) {
      return res.status(400).json({ 
        error: "Idempotency-Key header is required for POST requests" 
      });
    }

    if (req.headers['idempotency-key']) {
      headers['Idempotency-Key'] = req.headers['idempotency-key'];
    }

    const options = {
      method: req.method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: headers,
      cert: cert,
      key: key,
      rejectUnauthorized: true,
    };

    console.log(`Proxying ${req.method} to:`, url.hostname + url.pathname);

    // Faz a requisição para a API da Cora
    const apiResponse = await new Promise((resolve, reject) => {
      const apiReq = https.request(options, (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => (data += chunk));
        apiRes.on("end", () => {
          resolve({
            status: apiRes.statusCode,
            headers: apiRes.headers,
            body: data,
          });
        });
      });

      apiReq.on("error", (error) => {
        console.error("API request error:", error);
        reject(error);
      });

      // Envia o body se não for GET
      if (req.method !== 'GET' && req.body) {
        const bodyData = typeof req.body === 'object' 
          ? JSON.stringify(req.body) 
          : req.body;
        apiReq.write(bodyData);
      }

      apiReq.end();
    });

    // Retorna a resposta
    res.status(apiResponse.status).send(apiResponse.body);

  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "proxy_error",
      message: error.message,
    });
  }
}
