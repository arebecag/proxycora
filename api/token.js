// /api/token.js - Versão que aceita vários formatos de chave
import https from 'https';

const CORA_TOKEN_URL = 'https://matls-clients.api.cora.com.br/oauth/token';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    let certPem = process.env.CORA_CERT_PEM_B64;
    let keyPem = process.env.CORA_KEY_PEM_B64;

    // Log do formato da chave (sem mostrar o conteúdo completo)
    console.log('🔑 Formato da chave:', {
      comecaCom: keyPem?.substring(0, 30),
      terminaCom: keyPem?.substring(keyPem.length - 30),
      tamanho: keyPem?.length
    });

    if (!clientId || !certPem || !keyPem) {
      return res.status(500).json({ error: 'Credenciais incompletas' });
    }

    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    const url = new URL(CORA_TOKEN_URL);

    const options = {
      method: 'POST',
      hostname: url.hostname,
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

    console.log('📤 Enviando requisição para produção...');

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
        console.error('❌ Erro na requisição:', err.message);
        reject(err);
      });

      req.write(postData);
      req.end();
    });

    return res.status(response.status).send(response.body);

  } catch (error) {
    console.error('💥 Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
