import https from 'https';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Lê as variáveis de ambiente
    const tokenUrl = process.env.CORA_TOKEN_URL;
    const clientId = process.env.CORA_CLIENT_ID;
    const certPem = process.env.CORA_CERT_PEM_B64;
    const keyPem = process.env.CORA_KEY_PEM_B64;

    // Log para depuração (visível nos logs da Vercel)
    console.log('🔧 CORA_TOKEN_URL lida:', tokenUrl);
    console.log('🔧 CORA_CLIENT_ID lida:', clientId ? '***' : 'não definida');
    console.log('🔧 Certificado lido:', certPem ? 'sim' : 'não');

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

    // Prepara os dados do token
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    }).toString();

    const url = new URL(tokenUrl);
    console.log('📍 URL parseada:', { hostname: url.hostname, pathname: url.pathname });

    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    // Faz a requisição para a Cora
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('📥 Resposta da Cora - Status:', res.statusCode);
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

    // Retorna a resposta exata da Cora
    return res.status(response.status).send(response.body);

  } catch (error) {
    console.error('💥 Erro geral:', error);
    return res.status(500).json({ error: error.message });
  }
}
