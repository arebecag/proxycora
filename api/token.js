// /api/token.js
import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Pega a URL e garante que é exatamente o que queremos
    const tokenUrl = process.env.CORA_TOKEN_URL?.trim();
    
    // FORÇA o caminho correto (remove qualquer path antigo e coloca /oauth/token)
    const url = new URL(tokenUrl);
    url.pathname = '/oauth/token'; // 👈 FORÇA o caminho correto
    
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    console.log('🔧 URL final:', url.toString());
    console.log('🔧 Client ID:', clientId);

    if (!clientId || !certPem || !keyPem) {
      return res.status(500).json({ error: 'Credenciais incompletas' });
    }

    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: 443,
      path: url.pathname, // Agora é garantido que é /oauth/token
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    console.log('📤 Enviando para:', url.hostname + url.pathname);

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('📥 Status:', res.statusCode);
          resolve({ status: res.statusCode, body: data });
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    return res.status(response.status).send(response.body);

  } catch (error) {
    console.error('❌ Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
