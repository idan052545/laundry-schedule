/**
 * Gemini Multimodal Live API - WebSocket Voice Client
 *
 * Connects directly to Gemini's native audio model via WebSocket.
 * Streams raw PCM audio from microphone → Gemini → speaker in real-time.
 *
 * Audio specs:
 *   Input:  16-bit PCM, 16kHz, little-endian, mono
 *   Output: 16-bit PCM, 24kHz, little-endian, mono
 */

const GEMINI_MODEL = "gemini-2.5-flash-native-audio-latest";
const WS_URL_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export interface GeminiLiveConfig {
  apiKey: string;
  systemInstruction: string;
  language?: string;
  voiceName?: string;
  onTranscriptIn?: (text: string) => void;
  onTranscriptOut?: (text: string) => void;
  onStatusChange?: (status: GeminiLiveStatus) => void;
  onError?: (error: string) => void;
  onSimulationEnd?: () => void;
}

export type GeminiLiveStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "listening"
  | "ai-speaking"
  | "error";

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private config: GeminiLiveConfig;
  private status: GeminiLiveStatus = "disconnected";
  private audioQueue: Float32Array[] = [];
  private isPlayingAudio = false;
  private playbackContext: AudioContext | null = null;

  constructor(config: GeminiLiveConfig) {
    this.config = config;
  }

  get currentStatus() {
    return this.status;
  }

  private setStatus(status: GeminiLiveStatus) {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  async connect() {
    try {
      this.setStatus("connecting");

      const wsUrl = `${WS_URL_BASE}?key=${this.config.apiKey}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[GeminiLive] WebSocket opened, sending config...");
        this.sendConfig();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (event) => {
        console.error("[GeminiLive] WebSocket error:", event);
        this.config.onError?.("שגיאה בחיבור לשרת הקולי");
        this.setStatus("error");
      };

      this.ws.onclose = (event) => {
        console.log("[GeminiLive] WebSocket closed:", event.code, event.reason);
        if (this.status !== "disconnected") {
          this.setStatus("disconnected");
        }
      };
    } catch (error) {
      console.error("[GeminiLive] Failed to connect:", error);
      this.config.onError?.("נכשל בחיבור לשרת");
      this.setStatus("error");
    }
  }

  private sendConfig() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const configMessage = {
      setup: {
        model: `models/${GEMINI_MODEL}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          temperature: 0.8,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName || "Kore",
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: this.config.systemInstruction }],
        },
        tools: {
          functionDeclarations: [
            {
              name: "end_simulation",
              description: "Call this when the simulation should end because the user successfully completed the objective",
              parameters: {
                type: "OBJECT",
                properties: {
                  reason: { type: "STRING", description: "Why the simulation ended" },
                },
                required: ["reason"],
              },
            },
          ],
        },
        // Enable automatic voice activity detection (VAD)
        // This tells Gemini to detect when the user stops speaking
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            silenceDurationMs: 1500, // 1.5 seconds of silence = end of speech
            prefixPaddingMs: 300,
          },
        },
        // Enable transcription for both input and output
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    };

    console.log("[GeminiLive] Sending config:", JSON.stringify(configMessage).slice(0, 200) + "...");
    this.ws.send(JSON.stringify(configMessage));
  }

  private async handleMessage(event: MessageEvent) {
    try {
      // Gemini Live API can send both text (JSON) and binary messages
      let rawText: string;
      if (event.data instanceof Blob) {
        rawText = await event.data.text();
      } else if (event.data instanceof ArrayBuffer) {
        rawText = new TextDecoder().decode(event.data);
      } else {
        rawText = event.data;
      }

      const data = JSON.parse(rawText);

      // Handle setup complete
      if (data.setupComplete) {
        console.log("[GeminiLive] Setup complete");
        this.setStatus("connected");
        return;
      }

      // Handle server content (audio response)
      if (data.serverContent) {
        const sc = data.serverContent;

        // Audio from model
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              this.setStatus("ai-speaking");
              this.queueAudioPlayback(part.inlineData.data);
            }
          }
        }

        // Input transcription (what user said)
        if (sc.inputTranscription?.text) {
          console.log("[GeminiLive] User said:", sc.inputTranscription.text);
          this.config.onTranscriptIn?.(sc.inputTranscription.text);
        }

        // Output transcription (what AI said)
        if (sc.outputTranscription?.text) {
          const text = sc.outputTranscription.text;
          console.log("[GeminiLive] AI said:", text);
          this.config.onTranscriptOut?.(text);

          if (text.includes("כל הכבוד") && text.includes("סיימת את הסימולציה")) {
            this.config.onSimulationEnd?.();
          }
        }

        // Turn complete - AI finished speaking
        if (sc.turnComplete) {
          console.log("[GeminiLive] Turn complete");
          // Status will go to "listening" after audio playback finishes
        }
      }

      // Handle tool calls
      if (data.toolCall) {
        for (const fc of data.toolCall.functionCalls || []) {
          if (fc.name === "end_simulation") {
            console.log("[GeminiLive] Tool call: end_simulation", fc.args);
            this.config.onSimulationEnd?.();
            this.ws?.send(JSON.stringify({
              toolResponse: {
                functionResponses: [{
                  id: fc.id,
                  name: fc.name,
                  response: { result: "simulation_ended" },
                }],
              },
            }));
          }
        }
      }
    } catch (e) {
      console.error("[GeminiLive] Failed to parse message:", e);
    }
  }

  async startMicrophone() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: INPUT_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });

      // Load the PCM capture worklet
      const workletCode = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // Clone the data before posting
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true;
  }
}
registerProcessor('pcm-capture', PCMCaptureProcessor);
`;
      const blob = new Blob([workletCode], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-capture");

      this.workletNode.port.onmessage = (event) => {
        if (this.ws?.readyState === WebSocket.OPEN && this.status !== "disconnected") {
          const float32Data = event.data as Float32Array;
          const pcm16 = this.float32ToPCM16(float32Data);
          const base64 = this.arrayBufferToBase64(pcm16.buffer as ArrayBuffer);

          // Use the correct Gemini Live API format: realtimeInput.audio
          this.ws.send(JSON.stringify({
            realtimeInput: {
              audio: {
                data: base64,
                mimeType: "audio/pcm",
              },
            },
          }));
        }
      };

      this.sourceNode.connect(this.workletNode);
      // Connect to destination to keep the worklet alive
      this.workletNode.connect(this.audioContext.destination);

      console.log("[GeminiLive] Microphone started, streaming audio");
      this.setStatus("listening");
    } catch (error) {
      console.error("[GeminiLive] Microphone error:", error);
      this.config.onError?.("נא לאפשר גישה למיקרופון");
      this.setStatus("error");
    }
  }

  stopMicrophone() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    console.log("[GeminiLive] Sending text:", text);
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }

  disconnect() {
    console.log("[GeminiLive] Disconnecting...");
    this.stopMicrophone();
    this.stopAudioPlayback();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  // ─── Audio Playback ───

  private queueAudioPlayback(base64Data: string) {
    const pcm16 = this.base64ToPCM16(base64Data);
    const float32 = this.pcm16ToFloat32(pcm16);
    this.audioQueue.push(float32);

    if (!this.isPlayingAudio) {
      this.playNextChunk();
    }
  }

  private async playNextChunk() {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      if (this.status === "ai-speaking") {
        this.setStatus("listening");
      }
      return;
    }

    this.isPlayingAudio = true;

    if (!this.playbackContext || this.playbackContext.state === "closed") {
      this.playbackContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    }

    // Combine queued chunks for smoother playback
    const chunks = this.audioQueue.splice(0);
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const buffer = this.playbackContext.createBuffer(1, combined.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(combined);

    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);

    source.onended = () => {
      setTimeout(() => this.playNextChunk(), 30);
    };

    source.start();
  }

  private stopAudioPlayback() {
    this.audioQueue = [];
    this.isPlayingAudio = false;
    if (this.playbackContext && this.playbackContext.state !== "closed") {
      this.playbackContext.close();
      this.playbackContext = null;
    }
  }

  // ─── Audio Conversion Utilities ───

  private float32ToPCM16(float32: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  private pcm16ToFloat32(pcm16: Int16Array): Float32Array {
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
    }
    return float32;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToPCM16(base64: string): Int16Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }
}
