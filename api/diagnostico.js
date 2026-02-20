export default function handler(req, res) {
  const certPreview = process.env.CORA_CERT_PEM_B64 ? 
    process.env.CORA_CERT_PEM_B64.substring(0, 50) + '...' : 'ausente';
  
  const keyPreview = process.env.CORA_KEY_PEM_B64 ? 
    process.env.CORA_KEY_PEM_B64.substring(0, 20) + '...' : 'ausente';

  res.status(200).json({
    ambiente: "produção",
    cora_token_url: process.env.CORA_TOKEN_URL,
    cora_api_url: process.env.CORA_API_URL,
    client_id: process.env.CORA_CLIENT_ID,
    client_id_prefix: process.env.CORA_CLIENT_ID?.substring(0, 10),
    certificado: {
      presente: !!process.env.CORA_CERT_PEM_B64,
      preview: certPreview,
      tamanho: process.env.CORA_CERT_PEM_B64?.length
    },
    chave: {
      presente: !!process.env.CORA_KEY_PEM_B64,
      preview: keyPreview,
      tamanho: process.env.CORA_KEY_PEM_B64?.length
    },
    // Verifica se o certificado parece um PEM válido
    cert_formato_valido: process.env.CORA_CERT_PEM_B64?.includes('-----BEGIN CERTIFICATE-----'),
    key_formato_valido: process.env.CORA_KEY_PEM_B64?.includes('-----BEGIN PRIVATE KEY-----')
  });
}
