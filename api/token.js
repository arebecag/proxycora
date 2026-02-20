// /api/token.js
import https from 'https';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Pega a URL da Cora (NÃO é a mesma da Vercel)
    const tokenUrl = process.env.CORA_TOKEN_URL?.trim();
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    console.log('🔧 Token URL:', tokenUrl);
    console.log('🔧 Client ID:', clientId);

    if (!tokenUrl || !clientId || !certPem || !keyPem) {
      return res.status(500).json({ 
        error: 'Configuração incompleta',
        missing: {
          tokenUrl: !tokenUrl,
          clientId: !clientId,
          cert: !certPem,
          key: !keyPem
        }
      });
    }

    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    // Parseia a URL da Cora
    const url = new URL(tokenUrl);
    console.log('📍 Hostname (deve ser matls-clients.api.cora.com.br):', url.hostname);
    console.log('📍 Pathname (deve ser /oauth/token):', url.pathname);

    const options = {
      method: 'POST',
      hostname: url.hostname, // 👈 ISSO É CRÍTICO: usa o host da Cora, não da Vercel
      port: 443,
      path: url.pathname,
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    console.log('📤 Enviando requisição para:', url.hostname + url.pathname);

    // Faz a requisição para a Cora
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('📥 Status da Cora:', res.statusCode);
          resolve({ status: res.statusCode, body: data });
        });
      });

      req.on('error', (err) => {
        console.error('❌ Erro na requisição:', err.message);
        reject(err);
      });

      req.write(postData);
      req.end();
    });

    // Retorna a resposta da Cora
    return res.status(response.status).send(response.body);

  } catch (error) {
    console.error('💥 Erro geral:', error);
    return res.status(500).json({ error: error.message });
  }
}
