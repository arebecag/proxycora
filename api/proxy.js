// /api/proxy.js - Proxy para API de boletos
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: "Missing path" });
    }

    // API base do stage [citation:4]
    const baseUrl = "https://api.stage.cora.com.br";
    
    console.log(`🔄 Proxying ${req.method} to: ${baseUrl}${path}`);

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
    console.error("❌ Proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}
