# 🌎 Maya Translator Agent

Agente de traducción a lenguas indígenas mexicanas usando OpenAI Realtime API. Implementa Speech-to-Speech translation con soporte para múltiples lenguas ancestrales.

## 🎯 Características

- ✅ **Speech-to-Speech en tiempo real** con OpenAI Realtime API
- ✅ **8 lenguas indígenas** soportadas (Maya, Náhuatl, Zapoteco, etc.)
- ✅ **Contexto de trámites gubernamentales** para respuestas precisas
- ✅ **WebSocket API** para conexión desde Swift/iOS
- ✅ **REST API** para traducción de texto
- ✅ **Serverless** en Vercel con cold start optimizado

## 🗣️ Lenguas Soportadas

| Lengua | Hablantes | Regiones | Familia |
|--------|-----------|----------|---------|
| Maya Yucateco | 800,000 | Yucatán, Q. Roo, Campeche | Maya |
| Náhuatl | 1,700,000 | Puebla, Veracruz, Hidalgo | Uto-azteca |
| Zapoteco | 500,000 | Oaxaca | Otomangue |
| Mixteco | 500,000 | Oaxaca, Guerrero, Puebla | Otomangue |
| Otomí | 290,000 | Hidalgo, Edo. México | Otopame |
| Tzeltal | 470,000 | Chiapas | Maya |
| Totonaco | 250,000 | Veracruz, Puebla | Totonacana |
| Mazateco | 220,000 | Oaxaca | Otomangue |

## 🚀 Inicio Rápido

### 1. Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/maya-translator-agent.git
cd maya-translator-agent

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar tu OPENAI_API_KEY
```

### 2. Desarrollo Local

```bash
# Modo desarrollo con hot-reload
npm run dev

# El servidor estará disponible en:
# http://localhost:3000
```

### 3. Deployment a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configurar variable de entorno en Vercel
vercel env add OPENAI_API_KEY
```

## 📡 API Reference

### REST Endpoints

#### `GET /health`
Health check del servidor.

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-04T10:30:00.000Z",
  "service": "Maya Translator Agent",
  "version": "1.0.0"
}
```

---

#### `GET /api/languages`
Obtener todas las lenguas disponibles.

```bash
curl http://localhost:3000/api/languages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "maya",
      "name": "Maya Yucateco",
      "nameNative": "Maaya t'aan",
      "flag": "🇲🇽",
      "speakers": "800,000",
      "regions": ["Yucatán", "Quintana Roo", "Campeche"],
      "family": "Maya"
    }
  ]
}
```

---

#### `POST /api/session`
Crear una sesión de Realtime API.

```bash
curl -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{
    "language": "maya"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123...",
    "wsUrl": "wss://api.openai.com/v1/realtime?session_id=sess_abc123...",
    "language": "maya",
    "expiresAt": "2025-11-04T11:00:00Z"
  }
}
```

---

#### `POST /api/translate`
Traducir texto (modo chained como fallback).

```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "¿Cómo obtengo mi acta de nacimiento?",
    "language": "maya",
    "includesTramitesContext": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original": "¿Cómo obtengo mi acta de nacimiento?",
    "translation": "Bix in k'amik in tsíib siibal?",
    "language": "maya"
  }
}
```

### WebSocket API

#### Conexión
```javascript
const ws = new WebSocket('ws://localhost:3000/realtime');
```

#### Protocolo de Mensajes

**1. Configurar Sesión**
```javascript
ws.send(JSON.stringify({
  type: 'session.configure',
  language: 'maya',
  includesTramitesContext: true
}));
```

**2. Esperar Confirmación**
```javascript
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'session.ready') {
    console.log('Sesión lista');
  }
});
```

**3. Enviar Audio**
```javascript
ws.send(JSON.stringify({
  type: 'input_audio_buffer.append',
  audio: base64AudioData
}));
```

**4. Recibir Respuestas**
Los eventos de OpenAI Realtime API se reenvían directamente al cliente:
- `conversation.item.created`
- `response.audio.delta`
- `response.audio_transcript.delta`
- `response.done`

## 🔧 Integración con Swift

### Ejemplo básico en SwiftUI:

```swift
import Foundation

class MayaTranslatorService: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private let serverURL = "wss://your-app.vercel.app/realtime"
    
    @Published var isConnected = false
    @Published var currentTranscript = ""
    @Published var audioData: Data?
    
    func connect(language: String = "maya") {
        let url = URL(string: serverURL)!
        webSocket = URLSession.shared.webSocketTask(with: url)
        webSocket?.resume()
        
        // Configurar sesión
        let config = [
            "type": "session.configure",
            "language": language,
            "includesTramitesContext": true
        ]
        
        sendMessage(config)
        receiveMessages()
    }
    
    func sendAudio(_ audioData: Data) {
        let base64Audio = audioData.base64EncodedString()
        let message = [
            "type": "input_audio_buffer.append",
            "audio": base64Audio
        ]
        sendMessage(message)
    }
    
    private func sendMessage(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else {
            return
        }
        
        let message = URLSessionWebSocketTask.Message.string(string)
        webSocket?.send(message) { error in
            if let error = error {
                print("Error sending: \(error)")
            }
        }
    }
    
    private func receiveMessages() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleMessage(text)
                case .data(let data):
                    print("Received data: \(data)")
                @unknown default:
                    break
                }
                self?.receiveMessages()
                
            case .failure(let error):
                print("WebSocket error: \(error)")
            }
        }
    }
    
    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }
        
        switch type {
        case "session.ready":
            isConnected = true
            
        case "response.audio_transcript.delta":
            if let delta = json["delta"] as? String {
                currentTranscript += delta
            }
            
        case "response.audio.delta":
            if let audioBase64 = json["delta"] as? String,
               let audioData = Data(base64Encoded: audioBase64) {
                self.audioData = audioData
            }
            
        default:
            break
        }
    }
}
```

## 🎨 Vista Similar a Gemini Live

Para crear la interfaz como Gemini Live (imagen que compartiste):

```swift
struct LiveTranslatorView: View {
    @StateObject private var translator = MayaTranslatorService()
    @State private var isRecording = false
    
    var body: some View {
        ZStack {
            // Fondo con gradiente animado
            AnimatedGradientBackground()
            
            VStack {
                // Indicador de "Live"
                HStack {
                    Image(systemName: "waveform")
                        .symbolEffect(.variableColor)
                    Text("Live")
                        .font(.title2)
                        .bold()
                }
                .foregroundColor(.white)
                .padding(.top, 40)
                
                Spacer()
                
                // Visualización de onda de sonido
                WaveformView(isActive: isRecording)
                    .frame(height: 200)
                
                // Transcripción en tiempo real
                Text(translator.currentTranscript)
                    .font(.title3)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding()
                
                Spacer()
                
                // Botones de control
                HStack(spacing: 40) {
                    Button(action: {}) {
                        Image(systemName: "video")
                            .font(.system(size: 28))
                            .foregroundColor(.white)
                    }
                    
                    Button(action: {}) {
                        Image(systemName: "arrow.up.doc")
                            .font(.system(size: 28))
                            .foregroundColor(.white)
                    }
                    
                    Button(action: {}) {
                        Image(systemName: "pause.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white)
                    }
                    
                    Button(action: {
                        // Finalizar
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 28))
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.red)
                            .clipShape(Circle())
                    }
                }
                .padding(.bottom, 60)
            }
        }
        .onAppear {
            translator.connect(language: "maya")
        }
    }
}
```

## 💰 Costos Estimados

OpenAI Realtime API pricing (gpt-4o-realtime):
- **Audio input**: $100 / 1M tokens (~$0.06/min)
- **Audio output**: $200 / 1M tokens (~$0.24/min)
- **Text input**: $5 / 1M tokens
- **Text output**: $20 / 1M tokens

**Estimación para 1000 usuarios/mes** (5 min promedio cada uno):
- 5000 minutos de audio
- ~$300 USD/mes en audio
- + costos de texto (~$50)
- **Total: ~$350 USD/mes**

## 🛡️ Seguridad

- ✅ Rate limiting por IP
- ✅ Variables de entorno para API keys
- ✅ CORS configurado
- ✅ Validación de inputs
- ⚠️ TODO: Agregar autenticación JWT para producción

## 📝 Licencia

MIT

## 🤝 Contribuir

Pull requests son bienvenidos. Para cambios mayores, por favor abre un issue primero.

## 📧 Contacto

- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Email: tu-email@example.com

---

**Desarrollado con ❤️ para preservar las lenguas indígenas de México**
