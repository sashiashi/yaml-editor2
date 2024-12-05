import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = 3002;
const DEEPL_API_KEY = process.env.VITE_DEEPL_API_KEY;

if (!DEEPL_API_KEY) {
  console.error('DeepL API key is not set');
  process.exit(1);
}

app.use(cors({
  origin: 'http://localhost:5175',
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/translate', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const deepLResponse = await axios({
      method: 'POST',
      url: 'https://api-free.deepl.com/v2/translate',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        text: [text],
        source_lang: sourceLang || 'EN',
        target_lang: targetLang || 'JA'
      }
    });

    const translation = deepLResponse.data?.translations?.[0]?.text;
    if (!translation) {
      throw new Error('No translation received from DeepL');
    }

    res.json({ text: translation });

  } catch (error) {
    console.error('Translation error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    res.status(error.response?.status || 500).json({
      error: 'Translation failed',
      message: error.response?.data?.message || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('DeepL API Key:', DEEPL_API_KEY ? '設定済み' : '未設定');
});