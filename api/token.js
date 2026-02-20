// /api/token.js
import https from 'https';

// URL FIXA da Cora (produção)
const CORA_TOKEN_URL = 'https://matls-clients.api.cora.com.br/oauth/token';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Pega as credenciais das variáveis de ambiente
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    console.log('🚀 Iniciando token com URL fixa');
    console.log('📍 Client ID presente:', !!clientId);
    console.log('📍 Certificado presente:', !!certPem);
    console.log('📍 Chave presente:', !!keyPem);

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

    // 2. Parseia a URL da Cora
    const url = new URL(CORA_TOKEN_URL);
    console.log('🌐 Hostname (para onde vai):', url.hostname);
    console.log('🌐 Pathname:', url.pathname);

    // 3. Prepara os dados do formulário
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    // 4. Configura a requisição com o hostname e path CORRETOS
    const options = {
      method: 'POST',
      hostname: url.hostname, // 👈 ISSO É CRÍTICO: matls-clients.api.cora.com.br
      port: 443,
      path: url.pathname,      // /oauth/token
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    console.log('📤 Enviando requisição para a Cora...');

    // 5. Faz a requisição HTTPS para a Cora (NÃO para a Vercel)
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('📥 Status Code da Cora:', res.statusCode);
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

    // 6. Retorna a resposta da Cora
    return res.status(response.status).send(response.body);

  } catch (error) {
    console.error('💥 Erro no handler:', error);
    return res.status(500).json({ error: error.message });
  }
}
