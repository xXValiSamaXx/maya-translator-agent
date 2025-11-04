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
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioBuffer,
        model: 'whisper-1',
        language: language,
        response_format: 'json'
      });

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
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'mp3'
      });

      return mp3;
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
      const audioStream = await this.generateSpeech(translation);

      return {
        transcript,
        translation,
        audioStream
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
