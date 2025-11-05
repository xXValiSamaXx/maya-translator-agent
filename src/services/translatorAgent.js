import OpenAI from 'openai';
import { getSystemPrompt, isValidLanguageId } from '../config/languages.js';

/**
 * Agente de Traducción con OpenAI Realtime API
 * Implementa Speech-to-Speech para lenguas indígenas
 */
export class TranslatorAgent {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.openai = new OpenAI({ apiKey });
    this.currentLanguage = 'maya'; // Idioma por defecto
    this.sessionId = null;
  }

  /**
   * Cambiar lengua objetivo
   */
  setTargetLanguage(languageId) {
    if (!isValidLanguageId(languageId)) {
      throw new Error(`Invalid language ID: ${languageId}`);
    }
    this.currentLanguage = languageId;
    console.log(`✅ Target language set to: ${languageId}`);
  }

  /**
   * Obtener lengua actual
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Crear configuración de sesión Realtime
   */
  createSessionConfig(includesTramitesContext = false) {
    const systemPrompt = getSystemPrompt(
      this.currentLanguage,
      includesTramitesContext
    );

    return {
      model: 'gpt-4o-realtime-preview-2024-10-01',
      modalities: ['text', 'audio'],
      instructions: systemPrompt,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1'
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      },
      temperature: 0.7,
      max_response_output_tokens: 4096
    };
  }

  /**
   * Crear cliente WebSocket para Realtime API
   * Este método se usa desde el servidor Express
   */
  async createRealtimeConnection() {
    try {
      // Generar token de sesión efímero
      const response = await this.openai.sessions.create({
        model: 'gpt-4o-realtime-preview-2024-10-01',
        voice: 'alloy'
      });

      this.sessionId = response.id;
      
      return {
        sessionId: response.id,
        expiresAt: response.expires_at,
        wsUrl: `wss://api.openai.com/v1/realtime?session_id=${response.id}`
      };
    } catch (error) {
      console.error('❌ Error creating realtime session:', error);
      throw error;
    }
  }

  /**
   * Traducir texto (modo chained como fallback)
   */
  async translateText(text, includesTramitesContext = false) {
    try {
      const systemPrompt = getSystemPrompt(
        this.currentLanguage,
        includesTramitesContext
      );

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Error translating text:', error);
      throw error;
    }
  }

  /**
   * Transcribir audio con Whisper
   */
  async transcribeAudio(audioBuffer, language = 'es') {
    try {
      // Crear archivo temporal para Whisper
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `audio-${Date.now()}.wav`);
      
      // Escribir buffer a archivo temporal
      fs.writeFileSync(tempFile, audioBuffer);
      
      // Crear un File-like object
      const fileStream = fs.createReadStream(tempFile);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language: language,
        response_format: 'json'
      });

      // Limpiar archivo temporal
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignorar error al eliminar
      }

      return transcription.text;
    } catch (error) {
      console.error('❌ Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Generar audio con TTS
   */
  async generateSpeech(text) {
    try {
      // Limitar longitud del texto para evitar audios muy grandes
      const maxTextLength = 500;
      const truncatedText = text.length > maxTextLength 
        ? text.substring(0, maxTextLength) 
        : text;

      console.log(`📏 Text length: ${text.length} chars (using ${truncatedText.length})`);

      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: truncatedText,
        response_format: 'opus', // Opus es más comprimido que MP3
        speed: 1.0
      });

      // Convertir el stream a buffer inmediatamente
      const chunks = [];
      for await (const chunk of mp3) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);
      
      // Log del tamaño del audio
      const sizeInKB = (audioBuffer.length / 1024).toFixed(2);
      const sizeInMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);
      console.log(`🎵 Audio size: ${sizeInKB} KB (${sizeInMB} MB)`);

      // Verificar que el audio no sea demasiado grande (límite de 10MB)
      const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
      if (audioBuffer.length > maxSizeInBytes) {
        throw new Error(`Audio too large: ${sizeInMB} MB (max 10 MB)`);
      }

      return audioBuffer;
    } catch (error) {
      console.error('❌ Error generating speech:', error);
      throw error;
    }
  }

  /**
   * Proceso completo Speech-to-Speech (modo chained)
   */
  async processSpeechToSpeech(audioBuffer, includesTramitesContext = false) {
    try {
      console.log('🎤 Step 1: Transcribing audio...');
      const transcript = await this.transcribeAudio(audioBuffer, 'es');
      console.log(`📝 Transcript: "${transcript}"`);

      console.log('🔄 Step 2: Translating to indigenous language...');
      const translation = await this.translateText(
        transcript,
        includesTramitesContext
      );
      console.log(`🌐 Translation: "${translation}"`);

      console.log('🔊 Step 3: Generating speech...');
      const audioBuffer = await this.generateSpeech(translation);
      console.log('✅ Speech generated successfully');

      return {
        transcript,
        translation,
        audioBuffer
      };
    } catch (error) {
      console.error('❌ Error in speech-to-speech pipeline:', error);
      throw error;
    }
  }
}

/**
 * Factory para crear instancias del agente
 */
export function createTranslatorAgent(apiKey) {
  return new TranslatorAgent(apiKey);
}

export default TranslatorAgent;