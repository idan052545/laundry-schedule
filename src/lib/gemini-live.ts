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

const GEMINI_MODEL = "gemini-2.0-flash-live-001";
const WS_URL_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export interface GeminiLiveConfig {
  apiKey: string;
  systemInstruction: string;
  language?: string; // "iw" for Hebrew
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

      // Open WebSocket to Gemini Live API
      const wsUrl = `${WS_URL_BASE}?key=${this.config.apiKey}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.sendConfig();
        this.setStatus("connected");
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (event) => {
        console.error("Gemini WS error:", event);
        this.config.onError?.("שגיאה בחיבור לשרת הקולי");
        this.setStatus("error");
      };

      this.ws.onclose = (event) => {
        console.log("Gemini WS closed:", event.code, event.reason);
        if (this.status !== "disconnected") {
          this.setStatus("disconnected");
        }
      };
    } catch (error) {
      console.error("Failed to connect:", error);
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
        tools: [
          {
            functionDeclarations: [
              {
                name: "end_simulation",
                description: "Call this when the simulation should end because the user successfully completed the objective or the soldier says the ending phrase",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    reason: {
                      type: "STRING",
                      description: "Why the simulation ended",
                    },
                  },
                  required: ["reason"],
                },
              },
            ],
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(configMessage));
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      // Handle setup complete
      if (data.setupComplete) {
        console.log("Gemini Live setup complete");
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
          this.config.onTranscriptIn?.(sc.inputTranscription.text);
        }

        // Output transcription (what AI said)
        if (sc.outputTranscription?.text) {
          const text = sc.outputTranscription.text;
          this.config.onTranscriptOut?.(text);

          // Check if simulation ended
          if (text.includes("כל הכבוד") && text.includes("סיימת את הסימולציה")) {
            this.config.onSimulationEnd?.();
          }
        }

        // Turn complete - AI finished speaking
        if (sc.turnComplete) {
          // Will transition to listening after audio finishes playing
        }
      }

      // Handle tool calls
      if (data.toolCall) {
        for (const fc of data.toolCall.functionCalls || []) {
          if (fc.name === "end_simulation") {
            console.log("Simulation end triggered by AI:", fc.args);
            this.config.onSimulationEnd?.();

            // Send tool response back
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
      console.error("Failed to parse Gemini message:", e);
    }
  }

  async startMicrophone() {
    try {
      // Get microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: INPUT_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create AudioContext for capturing
      this.audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });

      // Load the PCM processor worklet
      await this.audioContext.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
              class PCMProcessor extends AudioWorkletProcessor {
                process(inputs) {
                  const input = inputs[0];
                  if (input && input[0]) {
                    this.port.postMessage(input[0]);
                  }
                  return true;
                }
              }
              registerProcessor('pcm-processor', PCMProcessor);
              `,
            ],
            { type: "application/javascript" }
          )
        )
      );

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

      this.workletNode.port.onmessage = (event) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          const float32Data = event.data as Float32Array;
          const pcm16 = this.float32ToPCM16(float32Data);
          const base64 = this.arrayBufferToBase64(pcm16.buffer);

          this.ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    data: base64,
                    mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                  },
                ],
              },
            })
          );
        }
      };

      this.sourceNode.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination); // needed to keep processing
      this.setStatus("listening");
    } catch (error) {
      console.error("Microphone error:", error);
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
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Send a text message (for hybrid text+voice)
  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true,
        },
      })
    );
  }

  disconnect() {
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

    // Combine all queued chunks for smoother playback
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
      // Check if more audio arrived while playing
      setTimeout(() => this.playNextChunk(), 50);
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

  private arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer as ArrayBuffer);
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
