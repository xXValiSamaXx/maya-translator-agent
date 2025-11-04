import 'dotenv/config';
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createTranslatorAgent } from './services/translatorAgent.js';
import { getAllLanguages, isValidLanguageId } from './config/languages.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Maya Translator Agent',
    version: '1.0.0'
  });
});

// ============================================
// ENDPOINTS REST
// ============================================

/**
 * Obtener todas las lenguas disponibles
 */
app.get('/api/languages', (req, res) => {
  try {
    const languages = getAllLanguages();
    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Crear sesión de Realtime API
 */
app.post('/api/session', async (req, res) => {
  try {
    const { language = 'maya' } = req.body;

    if (!isValidLanguageId(language)) {
      return res.status(400).json({
        success: false,
        error: `Invalid language: ${language}`
      });
    }

    const agent = createTranslatorAgent(process.env.OPENAI_API_KEY);
    agent.setTargetLanguage(language);

    const session = await agent.createRealtimeConnection();

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        wsUrl: session.wsUrl,
        language: language,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Traducir texto (modo chained)
 */
app.post('/api/translate', async (req, res) => {
  try {
    const { text, language = 'maya', includesTramitesContext = false } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    if (!isValidLanguageId(language)) {
      return res.status(400).json({
        success: false,
        error: `Invalid language: ${language}`
      });
    }

    const agent = createTranslatorAgent(process.env.OPENAI_API_KEY);
    agent.setTargetLanguage(language);

    const translation = await agent.translateText(text, includesTramitesContext);

    res.json({
      success: true,
      data: {
        original: text,
        translation,
        language
      }
    });
  } catch (error) {
    console.error('Error translating:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// WEBSOCKET SERVER PARA REALTIME
// ============================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🌎 Maya Translator Agent                 ║
║   📡 Server running on port ${PORT}           ║
║   🔗 http://localhost:${PORT}                 ║
╚════════════════════════════════════════════╝
  `);
});

const wss = new WebSocketServer({ server, path: '/realtime' });

wss.on('connection', (clientWs, req) => {
  console.log('🔌 New WebSocket connection established');

  let openaiWs = null;
  let currentLanguage = 'maya';
  let agent = null;

  // Manejo de mensajes del cliente (Swift app)
  clientWs.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received from client:', data.type);

      // Configurar sesión
      if (data.type === 'session.configure') {
        currentLanguage = data.language || 'maya';
        
        if (!isValidLanguageId(currentLanguage)) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: `Invalid language: ${currentLanguage}`
          }));
          return;
        }

        // Crear agente y obtener sesión de OpenAI
        agent = createTranslatorAgent(process.env.OPENAI_API_KEY);
        agent.setTargetLanguage(currentLanguage);

        const session = await agent.createRealtimeConnection();

        // Conectar a OpenAI Realtime API
        const { WebSocket } = await import('ws');
        openaiWs = new WebSocket(session.wsUrl);

        openaiWs.on('open', () => {
          console.log('✅ Connected to OpenAI Realtime API');
          
          // Enviar configuración de sesión
          const config = agent.createSessionConfig(data.includesTramitesContext);
          openaiWs.send(JSON.stringify({
            type: 'session.update',
            session: config
          }));

          // Notificar al cliente
          clientWs.send(JSON.stringify({
            type: 'session.ready',
            language: currentLanguage
          }));
        });

        openaiWs.on('message', (openaiMessage) => {
          // Reenviar mensajes de OpenAI al cliente
          clientWs.send(openaiMessage);
        });

        openaiWs.on('error', (error) => {
          console.error('❌ OpenAI WebSocket error:', error);
          clientWs.send(JSON.stringify({
            type: 'error',
            error: error.message
          }));
        });

        openaiWs.on('close', () => {
          console.log('🔌 OpenAI connection closed');
        });

        return;
      }

      // Reenviar otros mensajes a OpenAI si está conectado
      if (openaiWs && openaiWs.readyState === 1) {
        openaiWs.send(message);
      } else {
        clientWs.send(JSON.stringify({
          type: 'error',
          error: 'Session not configured. Send session.configure first.'
        }));
      }

    } catch (error) {
      console.error('❌ Error handling message:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  clientWs.on('close', () => {
    console.log('🔌 Client disconnected');
    if (openaiWs) {
      openaiWs.close();
    }
  });

  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error);
  });
});

// ============================================
// ERROR HANDLING
// ============================================

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

export default app;
