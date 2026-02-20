// /api/token.js
import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    if (!clientId || !certPem || !keyPem) {
      return res.status(500).json({ error: 'Credenciais incompletas' });
    }

    // HARDCODED: host e path EXATOS
    const options = {
      hostname: 'matls-clients.api.cora.com.br',
      port: 443,
      path: '/oauth/token', // 👈 APENAS ISSO, NADA MAIS
      method: 'POST',
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    options.headers['Content-Length'] = Buffer.byteLength(postData);

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data });
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    return res.status(response.status).send(response.body);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
