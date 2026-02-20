// /api/token.js - Versão SIMPLIFICADA para testes
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Credenciais de teste (pode colocar direto ou via env)
    const clientId = process.env.CORA_CLIENT_ID || "app-teste-doc";
    const clientSecret = process.env.CORA_CLIENT_SECRET || "81d231f4-f8e5-4b52-9c08-24dc45321a16";

    const tokenUrl = "https://matls-clients.api.stage.cora.com.br/token";
    
    const postData = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret // No stage precisa de secret!
    }).toString();

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: postData
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (err) {
    console.error("Token error:", err);
    return res.status(500).json({ error: err.message });
  }
}
