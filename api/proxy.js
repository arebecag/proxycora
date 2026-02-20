// /api/proxy.js
import https from 'https';
import fetch from 'node-fetch';

const certPem = process.env.CORA_CERT_PEM_B64;
const keyPem = process.env.CORA_KEY_PEM_B64;
const API_BASE = process.env.CORA_API_URL?.trim() || 'https://matls-api.cora.com.br';

const httpsAgent = new https.Agent({
  cert: certPem,
  key: keyPem,
  rejectUnauthorized: true,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Valida o path por segurança
    if (!path.startsWith('/v2/invoices/')) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    if (req.method === 'POST' && !req.headers['idempotency-key']) {
      return res.status(400).json({ 
        error: 'Idempotency-Key header is required for POST requests' 
      });
    }

    const url = `${API_BASE}${path}`;
    console.log(`🔄 Proxying ${req.method} to:`, url);

    const fetchOptions = {
      method: req.method,
      agent: httpsAgent,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...(req.headers['idempotency-key'] && { 'Idempotency-Key': req.headers['idempotency-key'] }),
      },
    };

    // Adiciona body se não for GET
    if (req.method !== 'GET' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();

    // Tenta retornar como JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      return res.status(response.status).json(jsonResponse);
    } catch {
      return res.status(response.status).send(responseText);
    }

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      error: 'proxy_error',
      message: error.message 
    });
  }
}
