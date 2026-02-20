// /api/token.js
import https from 'https';

// URL FIXA de produção (a que deve funcionar)
const CORA_TOKEN_URL_FIXA = 'https://matls-clients.api.cora.com.br/oauth/token';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Usa a URL fixa, não a variável de ambiente
    const tokenUrl = CORA_TOKEN_URL_FIXA;
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    // Log para diagnóstico
    console.log('🔧 Usando URL fixa:', tokenUrl);
    console.log('🔧 Client ID:', clientId ? '***' : 'não definido');

    if (!clientId || !certPem || !keyPem) {
      return res.status(500).json({
        error: 'Credenciais incompletas',
        missing: {
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

    const url = new URL(tokenUrl);
    console.log('📍 Hostname:', url.hostname);
    console.log('📍 Pathname:', url.pathname); // Deve ser /oauth/token

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true, // Segurança em produção
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    console.log('📤 Enviando requisição para a Cora...');

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('📥 Status Code da Cora:', res.statusCode);
          // Log do corpo apenas se não for 200 para não expor token
          if (res.statusCode !== 200) {
            console.log('📥 Corpo do erro:', data);
          }
          resolve({ status: res.statusCode, body: data });
        });
      });

      req.on('error', (err) => {
        console.error('❌ Erro na requisição HTTPS:', err.message);
        reject(err);
      });

      req.write(postData);
      req.end();
    });

    // Retorna a resposta exata da Cora para o cliente
    return res.status(response.status).send(response.body);

  } catch (error) {
    console.error('💥 Erro geral no token:', error);
    return res.status(500).json({ error: error.message });
  }
}
