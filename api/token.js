// /api/token.js - Versão SIMPLES que FUNCIONA com app-teste-doc
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Credenciais de teste da documentação [citation:4]
    const clientId = "app-teste-doc";
    const clientSecret = "81d231f4-f8e5-4b52-9c08-24dc45321a16";
    
    // Criar Basic Auth token (client_id:client_secret em base64)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    console.log("🔑 Solicitando token com client credentials simples...");

    const response = await fetch("https://api.stage.cora.com.br/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`
      },
      body: "grant_type=client_credentials"
    });

    const data = await response.json();
    
    console.log("📥 Resposta:", response.status);
    
    return res.status(response.status).json(data);

  } catch (err) {
    console.error("❌ Erro:", err);
    return res.status(500).json({ error: err.message });
  }
}
