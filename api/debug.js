// /api/debug.js
export default function handler(req, res) {
  const tokenUrl = process.env.CORA_TOKEN_URL;
  const apiUrl = process.env.CORA_API_URL;
  const clientId = process.env.CORA_CLIENT_ID;
  
  res.status(200).json({
    CORA_TOKEN_URL: tokenUrl,
    CORA_API_URL: apiUrl,
    CORA_CLIENT_ID: clientId ? "✓ configurado" : "✗ faltando",
    CORA_CERT_PEM_B64: process.env.CORA_CERT_PEM_B64 ? "✓ configurado" : "✗ faltando",
    CORA_KEY_PEM_B64: process.env.CORA_KEY_PEM_B64 ? "✓ configurado" : "✗ faltando",
    timestamp: new Date().toISOString()
  });
}
