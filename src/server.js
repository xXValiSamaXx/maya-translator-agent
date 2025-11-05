import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createTranslatorAgent } from '../src/services/translatorAgent.js';
import { getAllLanguages, isValidLanguageId } from '../src/config/languages.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    service: 'Maya Translator Agent',
    version: '1.0.0',
    status: 'ok',
    endpoints: {
      health: '/api/health',
      languages: '/api/languages',
      translate: 'POST /api/translate',
      translateAudio: 'POST /api/translate-audio'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Maya Translator Agent' });
});

app.get('/api/languages', (req, res) => {
  res.json({ success: true, data: getAllLanguages() });
});

app.post('/api/translate', async (req, res) => {
  try {
    const { text, language = 'maya', includesTramitesContext = false } = req.body;
    
    if (!text) return res.status(400).json({ success: false, error: 'Text required' });
    if (!isValidLanguageId(language)) return res.status(400).json({ success: false, error: 'Invalid language' });

    const agent = createTranslatorAgent(process.env.OPENAI_API_KEY);
    agent.setTargetLanguage(language);
    const translation = await agent.translateText(text, includesTramitesContext);

    res.json({ success: true, data: { original: text, translation, language } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/translate-audio', async (req, res) => {
  try {
    const { audio, language = 'maya', includesTramitesContext = false } = req.body;
    
    if (!audio) return res.status(400).json({ success: false, error: 'Audio required' });
    if (!isValidLanguageId(language)) return res.status(400).json({ success: false, error: 'Invalid language' });

    const audioBuffer = Buffer.from(audio, 'base64');
    const agent = createTranslatorAgent(process.env.OPENAI_API_KEY);
    agent.setTargetLanguage(language);
    
    const result = await agent.processSpeechToSpeech(audioBuffer, includesTramitesContext);
    
    const chunks = [];
    for await (const chunk of result.audioStream) {
      chunks.push(chunk);
    }
    const audioBase64 = Buffer.concat(chunks).toString('base64');

    res.json({
      success: true,
      data: {
        transcript: result.transcript,
        translation: result.translation,
        audio: audioBase64,
        language
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;