import https from 'https';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Missing path' });
    }

    // Validação do path (segurança)
    if (path !== '/v2/invoices/' && !path.startsWith('/v2/invoices/')) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    // Idempotency-Key é OBRIGATÓRIO pela documentação
    if (req.method === 'POST' && !req.headers['idempotency-key']) {
      return res.status(400).json({ 
        error: 'Idempotency-Key header is required for POST requests' 
      });
    }

    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    if (!certPem || !keyPem) {
      return res.status(500).json({ error: 'Certificates not configured' });
    }

    // Configuração FIXA baseada na documentação
    const options = {
      hostname: 'matls-api.cora.com.br',
      port: 443,
      path: path,
      method: req.method,
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...(req.headers['idempotency-key'] && { 'Idempotency-Key': req.headers['idempotency-key'] }),
      },
    };

    // Requisição para a Cora
    const response = await new Promise((resolve, reject) => {
      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          resolve({
            status: proxyRes.statusCode,
            body: data,
            headers: proxyRes.headers
          });
        });
      });

      proxyReq.on('error', (err) => {
        reject(err);
      });

      if (req.method !== 'GET' && req.body) {
        proxyReq.write(JSON.stringify(req.body));
      }

      proxyReq.end();
    });

    return res.status(response.status).send(response.body);

  } catch (error) {
    return res.status(500).json({ 
      error: 'Proxy error',
      message: error.message 
    });
  }
}
