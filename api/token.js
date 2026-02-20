// /api/token.js
import https from 'https';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Pega as credenciais
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    // Validação básica
    if (!clientId) {
      return res.status(500).json({ error: 'CORA_CLIENT_ID não configurado' });
    }
    if (!certPem || !keyPem) {
      return res.status(500).json({ error: 'Certificado ou chave não configurados' });
    }

    // DADOS FIXOS - NÃO MEXER
    const HOST = 'matls-clients.api.cora.com.br';
    const PATH = '/oauth/token'; // <--- ISSO É CRÍTICO, TEM QUE SER EXATAMENTE ISSO
    const METHOD = 'POST';

    console.log('🚀 Enviando para:', HOST + PATH);

    // Prepara os dados do formulário
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    // Opções da requisição - TUDO EXPLÍCITO
    const options = {
      hostname: HOST,
      port: 443,
      path: PATH,
      method: METHOD,
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

    // Retorna a resposta
    return res.status(response.status).send(response.body);

  } catch (error) {
    console.error('💥 Erro geral:', error);
    return res.status(500).json({ error: error.message });
  }
}
