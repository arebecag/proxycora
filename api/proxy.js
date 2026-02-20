import https from "https";

function b64ToBuffer(b64) {
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Pegar path da query string
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ 
        error: "Missing path parameter. Use ?path=/v2/invoices/" 
      });
    }

    // Validar path (segurança)
    const allowedPaths = ['/v2/invoices/', '/v2/invoices'];
    if (!allowedPaths.some(p => path.startsWith(p))) {
      return res.status(403).json({ 
        error: "Invalid path. Only /v2/invoices/ is allowed" 
      });
    }

    // Pegar variáveis de ambiente
    const apiBase = process.env.CORA_API_URL;
    const cert = b64ToBuffer(process.env.CORA_CERT_PEM_B64);
    const key = b64ToBuffer(process.env.CORA_KEY_PEM_B64);

    // Validar configuração
    if (!apiBase || !cert || !key) {
      console.error("Missing API configuration");
      return res.status(500).json({ 
        error: "API not properly configured" 
      });
    }

    // Construir URL
    const url = new URL(apiBase + path);

    // Preparar headers
    const headers = {
      'Authorization': req.headers.authorization,
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    // Validar Idempotency-Key para POST
    if (req.method === 'POST' && !req.headers['idempotency-key']) {
      return res.status(400).json({ 
        error: "Idempotency-Key header is required for POST requests",
        tip: "Generate a UUID v4 and send it in the Idempotency-Key header"
      });
    }

    // Adicionar Idempotency-Key se existir
    if (req.headers['idempotency-key']) {
      headers['Idempotency-Key'] = req.headers['idempotency-key'];
    }

    // Opções da requisição
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

    // Fazer requisição para API da Cora
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

      // Enviar body se não for GET
      if (req.method !== 'GET' && req.body) {
        const bodyData = typeof req.body === 'object' 
          ? JSON.stringify(req.body) 
          : req.body;
        apiReq.write(bodyData);
      }

      apiReq.end();
    });

    // Log response status
    console.log("API response status:", apiResponse.status);

    // Retornar resposta
    res.status(apiResponse.status).send(apiResponse.body);

  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "proxy_error",
      message: error.message,
    });
  }
}
