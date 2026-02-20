// /api/proxy.js - Versão SIMPLIFICADA para testes
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: "Missing path" });
    }

    // URL base do stage
    const baseUrl = "https://matls-clients.api.stage.cora.com.br";
    
    const response = await fetch(`${baseUrl}${path}`, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
        'Idempotency-Key': req.headers['idempotency-key']
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}
