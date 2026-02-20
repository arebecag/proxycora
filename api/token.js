// /api/token.js
import https from 'https';
import fetch from 'node-fetch';

// URL FIXA da Cora (produção)
const CORA_TOKEN_URL = 'https://matls-clients.api.cora.com.br/oauth/token';

// Pega as credenciais das variáveis de ambiente
const certPem = process.env.CORA_CERT_PEM_B64;
const keyPem = process.env.CORA_KEY_PEM_B64;

// Cria o agente HTTPS com os certificados
const httpsAgent = new https.Agent({
  cert: certPem,
  key: keyPem,
  rejectUnauthorized: true,
});

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientId = process.env.CORA_CLIENT_ID?.trim();

    // Logs para debug (vão aparecer nos logs da Vercel)
    console.log('🚀 Iniciando requisição de token');
    console.log('📍 URL:', CORA_TOKEN_URL);
    console.log('📍 Client ID presente:', !!clientId);
    console.log('📍 Certificado presente:', !!certPem);
    console.log('📍 Chave presente:', !!keyPem);

    // Validações
    if (!clientId) {
      return res.status(500).json({ error: 'CORA_CLIENT_ID não configurado' });
    }
    if (!certPem || !keyPem) {
      return res.status(500).json({ error: 'Certificado ou chave não configurados' });
    }

    // Prepara os dados do formulário
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    });

    console.log('📤 Enviando requisição para a Cora...');

    // FAZ A REQUISIÇÃO PARA A CORA (NÃO PARA A VERCEL)
    const response = await fetch(CORA_TOKEN_URL, {
      method: 'POST',
      agent: httpsAgent, // <--- ISSO É CRÍTICO
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData.toString(),
    });

    console.log('📥 Status Code da Cora:', response.status);

    // Lê a resposta
    const responseText = await response.text();
    
    // Tenta parsear como JSON para retornar bonito
    try {
      const jsonResponse = JSON.parse(responseText);
      return res.status(response.status).json(jsonResponse);
    } catch {
      // Se não for JSON, retorna como texto mesmo
      return res.status(response.status).send(responseText);
    }

  } catch (error) {
    console.error('💥 Erro detalhado:', error);
    return res.status(500).json({ 
      error: 'Erro interno',
      message: error.message,
      stack: error.stack 
    });
  }
}
