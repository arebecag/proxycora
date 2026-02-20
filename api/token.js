// /api/token.js - Versão que aceita qualquer formato
function getPemFromEnv(value) {
  if (!value) return null;
  
  // Se já parece um PEM (começa com ---), usa direto
  if (value.includes('-----BEGIN')) {
    return value;
  }
  
  // Se não, tenta converter de Base64
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return value; // Retorna original se não conseguir
  }
}

export default async function handler(req, res) {
  try {
    // Pega o valor direto da env (pode ser PEM ou Base64)
    const certPem = getPemFromEnv(process.env.CORA_CERT_PEM_B64);
    const keyPem = getPemFromEnv(process.env.CORA_KEY_PEM_B64);
    
    console.log("✅ Certificado carregado:", certPem ? "✓" : "✗");
    console.log("✅ Chave carregada:", keyPem ? "✓" : "✗");
    
    // Resto do código igual...
    const tokenUrl = process.env.CORA_TOKEN_URL;
    const clientId = process.env.CORA_CLIENT_ID;
    
    const postData = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
    }).toString();

    const url = new URL(tokenUrl);

    const options = {
      method: "POST",
      hostname: url.hostname,
      path: url.pathname,
      cert: certPem,  // Usa direto o PEM
      key: keyPem,     // Usa direto o PEM
      rejectUnauthorized: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const coraResp = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => resolve({ status: resp.statusCode, body: data }));
      });
      r.on("error", reject);
      r.write(postData);
      r.end();
    });

    return res.status(coraResp.status).send(coraResp.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
