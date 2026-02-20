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
    // 1. Pega as credenciais
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    console.log('🚀 Iniciando token com fetch');
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

    // 2. Cria um agente HTTPS com o certificado e a chave
    //    Isso é o que realmente importa para a autenticação mTLS
    const agent = new https.Agent({
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true, // Segurança em produção
    });

    // 3. Prepara os dados do formulário
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    });

    console.log('📤 Enviando requisição para:', CORA_TOKEN_URL);

    // 4. Faz a requisição usando fetch com o agente HTTPS personalizado
    const response = await fetch(CORA_TOKEN_URL, {
      method: 'POST',
      agent: agent, // <--- AQUI ESTÁ A CHAVE: o agente com o certificado
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData.toString(),
    });

    console.log('📥 Status Code da Cora:', response.status);

    // 5. Lê o corpo da resposta
    const responseText = await response.text();
    
    // 6. Retorna a resposta exata da Cora para o cliente
    res.status(response.status).send(responseText);

  } catch (error) {
    console.error('💥 Erro no handler:', error);
    return res.status(500).json({ error: error.message });
  }
}
