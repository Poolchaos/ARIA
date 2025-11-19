/**
 * Azure Cognitive Services Text-to-Speech Service
 * Provides natural, neural voice synthesis with emotion control
 */

import axios from 'axios';

export type Emotion = 'happy' | 'sad' | 'calm' | 'fearful' | 'excited' | 'neutral';

interface AzureTTSConfig {
  subscriptionKey: string;
  region: string;
  voiceName?: string;
}

interface SpeechOptions {
  text: string;
  emotion?: Emotion;
  rate?: number; // 0.5 to 2.0
  pitch?: number; // -50% to +50%
  volume?: number; // 0 to 100
}

/**
 * Azure TTS Service
 * Free tier: 5M characters/month
 * Neural voices for natural, human-like speech
 */
class AzureTTSService {
  private config: AzureTTSConfig;
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;

  constructor(config: AzureTTSConfig) {
    this.config = {
      voiceName: 'en-US-JennyNeural', // Warm, friendly female voice
      ...config,
    };
  }

  /**
   * Initialize Web Audio API context
   */
  private initAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  /**
   * Generate SSML with emotion and prosody control
   */
  private generateSSML(options: SpeechOptions): string {
    const { text, emotion = 'neutral', rate = 1.0, pitch = 0 } = options;

    // Map emotions to Azure neural voice styles
    const styleMap: Record<Emotion, string> = {
      happy: 'cheerful',
      sad: 'sad',
      calm: 'calm',
      fearful: 'fearful',
      excited: 'excited',
      neutral: 'friendly',
    };

    const style = styleMap[emotion] || 'friendly';
    const ratePercent = Math.round((rate - 1) * 100);
    const pitchPercent = Math.round(pitch);

    return `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
             xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
        <voice name="${this.config.voiceName}">
          <mstts:express-as style="${style}" styledegree="1.5">
            <prosody rate="${ratePercent >= 0 ? '+' : ''}${ratePercent}%"
                     pitch="${pitchPercent >= 0 ? '+' : ''}${pitchPercent}%">
              ${text}
            </prosody>
          </mstts:express-as>
        </voice>
      </speak>
    `.trim();
  }

  /**
   * Synthesize speech from text using Azure TTS
   * Returns audio data and analyser node for visualization
   */
  async synthesize(options: SpeechOptions): Promise<{
    audio: AudioBuffer;
    play: () => Promise<AnalyserNode>;
    stop: () => void;
  }> {
    const ssml = this.generateSSML(options);
    const endpoint = `https://${this.config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    try {
      const response = await axios.post(endpoint, ssml, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        },
        responseType: 'arraybuffer',
      });

      const audioContext = this.initAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(response.data);

      const play = async (): Promise<AnalyserNode> => {
        if (!this.audioContext) {
          throw new Error('Audio context not initialized');
        }

        // Stop any currently playing audio
        this.stop();

        // Create audio source
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = audioBuffer;

        // Create analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256; // Frequency resolution
        this.analyser.smoothingTimeConstant = 0.8; // Smooth transitions

        // Connect: source -> analyser -> destination
        this.audioSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // Start playback
        this.audioSource.start(0);

        return this.analyser;
      };

      const stop = () => {
        if (this.audioSource) {
          try {
            this.audioSource.stop();
          } catch {
            // Already stopped
          }
          this.audioSource.disconnect();
          this.audioSource = null;
        }
      };

      return { audio: audioBuffer, play, stop };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Azure TTS Error:', error.response?.data || error.message);
        throw new Error(`Azure TTS failed: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get the current analyser node for real-time frequency data
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Stop current playback
   */
  stop() {
    if (this.audioSource) {
      try {
        this.audioSource.stop();
      } catch {
        // Already stopped
      }
      this.audioSource.disconnect();
      this.audioSource = null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export default AzureTTSService;
