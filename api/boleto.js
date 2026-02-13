
// api/boleto.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import https from 'https';

export default async function handler(req, res) {
  // CONFIGURAÇÃO CORS - ESSENCIAL!
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder a preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Aceitar apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const environment = req.query.env || 'test';
    const isProduction = environment === 'production';
    
    const baseUrl = isProduction 
      ? 'https://matls-clients.api.cora.com.br/v2'
      : 'https://matls-clients.api.stage.cora.com.br/v2';

    // Pegar certificados das variáveis de ambiente
    const certContent = process.env.CORA_CERTIFICATE;
    const keyContent = process.env.CORA_PRIVATE_KEY;

    if (!certContent || !keyContent) {
      console.error('Certificados não encontrados');
      return res.status(500).json({ error: 'Configuração de certificados ausente' });
    }

    // Criar arquivos temporários
    const certPath = path.join('/tmp', 'certificate.pem');
    const keyPath = path.join('/tmp', 'private-key.key');
    
    fs.writeFileSync(certPath, certContent);
    fs.writeFileSync(keyPath, keyContent);

    // Configurar agente HTTPS com certificados
    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      rejectUnauthorized: true
    });

    const boletoData = req.body;
    
    // Garantir que tem um code único
    if (!boletoData.code) {
      boletoData.code = `BOLETO_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    console.log('Enviando para Cora:', {
      url: `${baseUrl}/invoices/pay`,
      ambiente: environment
    });

    // Fazer requisição para a Cora com mTLS
    const response = await fetch(`${baseUrl}/invoices/pay`, {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': boletoData.code
      },
      body: JSON.stringify(boletoData)
    });

    // Limpar arquivos temporários
    try {
      fs.unlinkSync(certPath);
      fs.unlinkSync(keyPath);
    } catch (e) {
      console.warn('Erro ao limpar arquivos:', e.message);
    }

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Erro da Cora:', responseData);
      return res.status(response.status).json({
        error: 'Erro na API da Cora',
        details: responseData
      });
    }

    // Retornar resposta com headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Erro no proxy:', error.message);
    return res.status(500).json({ 
      error: 'Erro interno no proxy',
      message: error.message 
    });
  }
}
