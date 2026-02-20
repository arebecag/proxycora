// /api/proxy.js
import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'Missing path' });
    }

    const apiBase = process.env.CORA_API_URL?.trim();
    const cert = process.env.CORA_CERT_PEM_B64;
    const key = process.env.CORA_KEY_PEM_B64;

    if (!apiBase || !cert || !key) {
      return res.status(500).json({ error: 'API not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    if (req.method === 'POST' && !req.headers['idempotency-key']) {
      return res.status(400).json({ error: 'Idempotency-Key required for POST' });
    }

    // Constrói URL completa
    const fullUrl = apiBase + path;
    const url = new URL(fullUrl);
    
    console.log('📍 Proxy para:', url.hostname + url.pathname);

    const options = {
      method: req.method,
      hostname: url.hostname, // 👈 USA O HOST DA CORA
      port: 443,
      path: url.pathname + url.search,
      cert: cert,
      key: key,
      rejectUnauthorized: true,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Idempotency-Key': req.headers['idempotency-key']
      }
    };

    const response = await new Promise((resolve, reject) => {
      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          resolve({ status: proxyRes.statusCode, body: data });
        });
      });
      
      proxyReq.on('error', (err) => {
        console.error('❌ Erro no proxy:', err.message);
        reject(err);
      });
      
      if (req.method !== 'GET' && req.body) {
        proxyReq.write(JSON.stringify(req.body));
      }
      proxyReq.end();
    });

    return res.status(response.status).send(response.body);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
