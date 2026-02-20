// /api/token.js
import https from 'https';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Lê e limpa a URL do token (remove espaços e quebras de linha)
    const tokenUrlRaw = process.env.CORA_TOKEN_URL;
    if (!tokenUrlRaw) {
      return res.status(500).json({ error: 'CORA_TOKEN_URL não configurada' });
    }
    const tokenUrl = tokenUrlRaw.trim();

    const clientId = process.env.CORA_CLIENT_ID;
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    if (!clientId || !certPem || !keyPem) {
      return res.status(500).json({ error: 'Credenciais incompletas' });
    }

    // Prepara os dados do formulário
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    // Parseia a URL para extrair hostname e path corretos
    const url = new URL(tokenUrl);
    console.log('📍 Hostname:', url.hostname);
    console.log('📍 Pathname:', url.pathname); // DEVE SER "/oauth/token"

    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname, // <--- USA O PATH DA URL
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    // Faz a requisição
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
    console.error('Erro no token:', error);
    return res.status(500).json({ error: error.message });
  }
}
