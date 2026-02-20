import https from 'https';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Credenciais da Vercel
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    if (!clientId || !certPem || !keyPem) {
      return res.status(500).json({ 
        error: 'Credenciais incompletas na Vercel',
        missing: {
          clientId: !clientId,
          cert: !certPem,
          key: !keyPem
        }
      });
    }

    // Dados do token - EXATAMENTE como na documentação
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    // Configuração FIXA baseada na documentação
    const options = {
      hostname: 'matls-clients.api.cora.com.br',
      port: 443,
      path: '/oauth/token',
      method: 'POST',
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    // Requisição para a Cora
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });

    // Retorna a resposta da Cora
    return res.status(response.status).send(response.body);

  } catch (error) {
    return res.status(500).json({ 
      error: 'Erro interno',
      message: error.message 
    });
  }
}
