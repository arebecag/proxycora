// /api/check-env.js
export default function handler(req, res) {
  res.status(200).json({
    env_token_url: process.env.CORA_TOKEN_URL,
    env_api_url: process.env.CORA_API_URL,
    env_client_id: process.env.CORA_CLIENT_ID ? 'definido' : 'não definido',
    env_cert: process.env.CORA_CERT_PEM_B64 ? 'definido' : 'não definido',
    env_key: process.env.CORA_KEY_PEM_B64 ? 'definido' : 'não definido',
    node_version: process.version
  });
}
