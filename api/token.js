export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const tokenUrl = process.env.CORA_TOKEN_URL;
    const clientId = process.env.CORA_CLIENT_ID;
    const clientSecret = process.env.CORA_CLIENT_SECRET;

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Proxy error",
      details: error.message,
    });
  }
}
