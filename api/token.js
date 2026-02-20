// /api/token.js
import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log 1: Recebemos a requisição
  console.log('🚀 [1] Requisição recebida em /api/token');

  try {
    const clientId = process.env.CORA_CLIENT_ID?.trim();
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    // Log 2: Variáveis de ambiente
    console.log('📌 [2] Variáveis:', {
      clientId: clientId ? 'presente' : 'ausente',
      certPem: certPem ? 'presente' : 'ausente',
      keyPem: keyPem ? 'presente' : 'ausente',
      certLength: certPem?.length,
      keyLength: keyPem?.length,
    });

    if (!clientId || !certPem || !keyPem) {
      return res.status(500).json({ error: 'Credenciais incompletas' });
    }

    // URL da Cora (HARDCODED para evitar qualquer erro de variável)
    const CORA_HOST = 'matls-clients.api.cora.com.br';
    const CORA_PATH = '/oauth/token';
    const CORA_URL = `https://${CORA_HOST}${CORA_PATH}`;

    // Log 3: Para onde vamos enviar
    console.log('🎯 [3] Enviando para:', CORA_URL);

    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    // Opções EXPLÍCITAS para o https.request
    const options = {
      hostname: CORA_HOST,        // Hardcoded
      port: 443,
      path: CORA_PATH,            // Hardcoded
      method: 'POST',
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    // Log 4: Opções configuradas
    console.log('⚙️ [4] Opções:', {
      hostname: options.hostname,
      path: options.path,
      method: options.method,
      certLength: options.cert?.length,
      keyLength: options.key?.length,
    });

    // Faz a requisição
    const response = await new Promise((resolve, reject) => {
      const coraReq = https.request(options, (coraRes) => {
        let data = '';
        coraRes.on('data', (chunk) => { data += chunk; });
        coraRes.on('end', () => {
          // Log 5: Resposta recebida
          console.log('📥 [5] Resposta da Cora - Status:', coraRes.statusCode);
          console.log('📥 [5] Headers da Cora:', JSON.stringify(coraRes.headers));
          console.log('📥 [5] Body (primeiros 100 chars):', data.substring(0, 100));
          resolve({ status: coraRes.statusCode, body: data });
        });
      });

      coraReq.on('error', (err) => {
        // Log 6: Erro na requisição
        console.error('❌ [6] Erro na requisição:', err.message);
        console.error('❌ [6] Código do erro:', err.code);
        console.error('❌ [6] Stack:', err.stack);
        reject(err);
      });

      coraReq.write(postData);
      coraReq.end();
    });

    // Log 7: Antes de retornar
    console.log('✅ [7] Retornando resposta com status:', response.status);
    return res.status(response.status).send(response.body);

  } catch (error) {
    // Log 8: Erro geral
    console.error('💥 [8] Erro geral:', error);
    console.error('💥 [8] Mensagem:', error.message);
    console.error('💥 [8] Stack:', error.stack);
    return res.status(500).json({ error: error.message });
  }
}
