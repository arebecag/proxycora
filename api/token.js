import https from "https";

export default async function handler(req, res) {
  try {
    const tokenUrl = process.env.CORA_TOKEN_URL;
    const clientId = process.env.CORA_CLIENT_ID;

    const certPem = Buffer.from(process.env.CORA_CERT_PEM_B64, "base64").toString("utf8");
    const keyPem  = Buffer.from(process.env.CORA_KEY_PEM_B64, "base64").toString("utf8");

    const postData = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
    }).toString();

    const url = new URL(tokenUrl);

    const options = {
      method: "POST",
      hostname: url.hostname,
      path: url.pathname,
      cert: certPem,
      key: keyPem,
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

    res.status(coraResp.status || 500).send(coraResp.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
