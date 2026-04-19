require('dotenv').config();
const axios = require('axios');
const sharp = require('sharp');
const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');

const PROXY = `https://${process.env.BRD_USER}:${process.env.BRD_PASS}@${process.env.BRD_HOST}:${process.env.BRD_PORT}`;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

// Ignora erros de certificado SSL do proxy (equivalente ao -k do curl)
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url, retries = MAX_RETRIES) {
  const agent = new HttpsProxyAgent(PROXY, { rejectUnauthorized: false });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        httpsAgent: agent,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://commons.wikimedia.org/',
        },
        timeout: 60000,
      });

      const optimized = await sharp(Buffer.from(res.data))
        .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
        .toFormat('jpeg', { quality: 85 })
        .toBuffer();

      return `data:image/jpeg;base64,${optimized.toString('base64')}`;
    } catch (err) {
      const isLast = attempt === retries;
      if (isLast) throw err;
      console.warn(`    Tentativa ${attempt} falhou (${err.message}). Aguardando ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

module.exports = { downloadImage };
