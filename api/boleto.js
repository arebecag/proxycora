import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("=== INÍCIO ===");
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const environment = req.query.env || 'test';
    const isProduction = environment === 'production';
    
    const baseUrl = isProduction 
      ? 'https://matls-clients.api.cora.com.br/v2'
      : 'https://matls-clients.api.stage.cora.com.br/v2';

    console.log("Ambiente:", environment);
    console.log("URL:", baseUrl + "/invoices/pay");

    // PEGAR CERTIFICADOS DAS SUAS VARIÁVEIS
    const certBase64 = process.env.CORA_CERT_PEM_B64;
    const keyBase64 = process.env.CORA_KEY_PEM_B64;

    console.log("Certificado Base64 encontrado?", !!certBase64);
    console.log("Key Base64 encontrada?", !!keyBase64);

    if (!certBase64 || !keyBase64) {
      return res.status(500).json({ 
        error: 'Certificados não encontrados',
        details: 'CORA_CERT_PEM_B64 e CORA_KEY_PEM_B64 são obrigatórios'
      });
    }

    // DECODIFICAR BASE64 PARA PEM
    const certPem = Buffer.from(certBase64, 'base64').toString('utf-8');
    const keyPem = Buffer.from(keyBase64, 'base64').toString('utf-8');

    console.log("Certificado decodificado (primeira linha):", certPem.split('\n')[0]);
    console.log("Key decodificada (primeira linha):", keyPem.split('\n')[0]);

    // Criar arquivos temporários
    const certPath = path.join('/tmp', 'certificate.pem');
    const keyPath = path.join('/tmp', 'private-key.key');
    
    fs.writeFileSync(certPath, certPem);
    fs.writeFileSync(keyPath, keyPem);

    console.log("Arquivos temporários criados");

    // Configurar agente HTTPS
    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      rejectUnauthorized: true
    });

    const boletoData = req.body;
    console.log("Payload:", JSON.stringify(boletoData, null, 2));

    // Enviar para Cora
    const response = await fetch(`${baseUrl}/invoices/pay`, {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': boletoData.code || `BOLETO_${Date.now()}`
      },
      body: JSON.stringify(boletoData)
    });

    console.log("Status da Cora:", response.status);

    const responseData = await response.json();
    console.log("Resposta da Cora:", responseData);

    // Limpar arquivos
    try {
      fs.unlinkSync(certPath);
      fs.unlinkSync(keyPath);
    } catch (e) {}

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erro na API da Cora',
        details: responseData
      });
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("ERRO:", error);
    return res.status(500).json({ 
      error: 'Erro interno',
      message: error.message 
    });
  }
}
