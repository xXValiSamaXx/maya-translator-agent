import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createTranslatorAgent } from '../src/services/translatorAgent.js';
import { getAllLanguages, isValidLanguageId } from '../src/config/languages.js';

const app = express();

app.use(cors({ origin: '*' }));
// Aumentar límite para audio base64, pero no demasiado para evitar abusos
app.use(express.json({ limit: '50mb' }));

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

    // Log del tamaño del audio de entrada
    const inputSizeKB = (audio.length * 0.75 / 1024).toFixed(2); // base64 aprox
    console.log(`📥 Input audio size: ${inputSizeKB} KB`);

    const audioBuffer = Buffer.from(audio, 'base64');
    const agent = createTranslatorAgent(process.env.OPENAI_API_KEY);
    agent.setTargetLanguage(language);
    
    const result = await agent.processSpeechToSpeech(audioBuffer, includesTramitesContext);
    
    // Convertir el buffer de audio a base64
    const audioBase64 = result.audioBuffer.toString('base64');
    
    // Log del tamaño de la respuesta
    const outputSizeKB = (audioBase64.length * 0.75 / 1024).toFixed(2);
    const outputSizeMB = (audioBase64.length * 0.75 / (1024 * 1024)).toFixed(2);
    console.log(`📤 Output audio size: ${outputSizeKB} KB (${outputSizeMB} MB)`);

    // Verificar límite de Vercel (4.5MB para respuesta)
    const maxResponseSize = 4.5 * 1024 * 1024; // 4.5 MB en bytes
    if (audioBase64.length > maxResponseSize) {
      throw new Error(`Response too large: ${outputSizeMB} MB (Vercel limit: 4.5 MB)`);
    }

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
    console.error('❌ Error in /api/translate-audio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;