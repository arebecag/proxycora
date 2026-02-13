import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import https from 'https';

export default async function handler(req, res) {
  // CORS
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

  const logs = []; // Array para capturar logs
  const addLog = (msg, data) => {
    const logMsg = data ? `${msg}: ${JSON.stringify(data)}` : msg;
    console.log(logMsg);
    logs.push(logMsg);
  };

  try {
    addLog("=== INÍCIO DA REQUISIÇÃO ===");
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    addLog("Token recebido?", !!token);
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido', logs });
    }

    const environment = req.query.env || 'test';
    const isProduction = environment === 'production';
    
    const baseUrl = isProduction 
      ? 'https://matls-clients.api.cora.com.br/v2'
      : 'https://matls-clients.api.stage.cora.com.br/v2';

    addLog("Ambiente", { environment, baseUrl });

    // PEGAR CERTIFICADOS
    const certBase64 = process.env.CORA_CERT_PEM_B64;
    const keyBase64 = process.env.CORA_KEY_PEM_B64;

    addLog("Certificado Base64 encontrado?", !!certBase64);
    addLog("Key Base64 encontrada?", !!keyBase64);

    if (!certBase64 || !keyBase64) {
      return res.status(500).json({ 
        error: 'Certificados não encontrados',
        details: 'CORA_CERT_PEM_B64 e CORA_KEY_PEM_B64 são obrigatórios',
        logs
      });
    }

    // DECODIFICAR BASE64
    addLog("Iniciando decodificação Base64");
    const certPem = Buffer.from(certBase64, 'base64').toString('utf-8');
    const keyPem = Buffer.from(keyBase64, 'base64').toString('utf-8');

    addLog("Certificado decodificado (primeira linha)", certPem.split('\n')[0]);
    addLog("Key decodificada (primeira linha)", keyPem.split('\n')[0]);

    // VERIFICAR FORMATO PEM
    const certValid = certPem.includes('-----BEGIN CERTIFICATE-----') && 
                      certPem.includes('-----END CERTIFICATE-----');
    const keyValid = keyPem.includes('-----BEGIN PRIVATE KEY-----') && 
                     keyPem.includes('-----END PRIVATE KEY-----');
    
    addLog("Certificado formato válido?", certValid);
    addLog("Key formato válido?", keyValid);

    if (!certValid || !keyValid) {
      return res.status(500).json({
        error: 'Certificados em formato inválido',
        details: 'Os certificados devem estar no formato PEM com BEGIN/END tags',
        logs
      });
    }

    // CRIAR ARQUIVOS TEMPORÁRIOS
    const certPath = path.join('/tmp', `cert_${Date.now()}.pem`);
    const keyPath = path.join('/tmp', `key_${Date.now()}.key`);
    
    fs.writeFileSync(certPath, certPem);
    fs.writeFileSync(keyPath, keyPem);

    addLog("Arquivos temporários criados", { certPath, keyPath });

    // VERIFICAR ARQUIVOS
    const certFileContent = fs.readFileSync(certPath, 'utf-8');
    const keyFileContent = fs.readFileSync(keyPath, 'utf-8');
    
    addLog("Arquivo certificado (primeira linha)", certFileContent.split('\n')[0]);
    addLog("Arquivo key (primeira linha)", keyFileContent.split('\n')[0]);

    // CONFIGURAR AGENTE HTTPS
    const httpsAgent = new https.Agent({
      cert: certFileContent,
      key: keyFileContent,
      rejectUnauthorized: true,
      keepAlive: false
    });

    addLog("Agente HTTPS configurado");

    const boletoData = req.body;
    addLog("Payload recebido", {
      code: boletoData.code,
      amount: boletoData.amount,
      due_date: boletoData.due_date
    });

    // ENVIAR PARA CORA
    addLog("Enviando requisição para Cora...");
    
    const startTime = Date.now();
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
    const endTime = Date.now();

    addLog("Resposta recebida", {
      status: response.status,
      statusText: response.statusText,
      timeMs: endTime - startTime,
      headers: Object.fromEntries(response.headers)
    });

    const responseText = await response.text();
    addLog("Corpo da resposta", responseText.substring(0, 500)); // Primeiros 500 caracteres

    // TENTAR PARSEAR COMO JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      addLog("Resposta parseada como JSON");
    } catch {
      responseData = { raw: responseText };
      addLog("Resposta não é JSON válido");
    }

    // LIMPAR ARQUIVOS
    try {
      fs.unlinkSync(certPath);
      fs.unlinkSync(keyPath);
      addLog("Arquivos temporários removidos");
    } catch (e) {
      addLog("Erro ao remover arquivos", e.message);
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erro na API da Cora',
        details: responseData,
        statusCode: response.status,
        logs
      });
    }

    addLog("=== REQUISIÇÃO BEM SUCEDIDA ===");
    return res.status(200).json({
      ...responseData,
      _debug: { logs }
    });

  } catch (error) {
    addLog("ERRO NO PROXY", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return res.status(500).json({ 
      error: 'Erro interno no proxy',
      message: error.message,
      stack: error.stack,
      logs
    });
  }
}
