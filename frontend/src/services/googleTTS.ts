export type Emotion = 'neutral' | 'happy' | 'sad' | 'calm';

interface GoogleTTSOptions {
  apiUrl: string; // Backend API URL
}

interface SynthesizeOptions {
  text: string;
  emotion?: Emotion;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface AudioResult {
  audio: HTMLAudioElement;
  play: () => Promise<AnalyserNode>;
  stop: () => void;
}

/**
 * Google Cloud Text-to-Speech Service via Backend Proxy
 * Keeps service account credentials secure on the server
 */
export default class GoogleTTSService {
  private apiUrl: string;
  private audioContext: AudioContext | null = null;

  constructor(options: GoogleTTSOptions) {
    this.apiUrl = options.apiUrl;
  }

  async synthesize(options: SynthesizeOptions): Promise<AudioResult> {
    const { text, emotion = 'neutral', rate = 1.0, pitch = 0, volume = 1.0 } = options;

    console.log('[GoogleTTS] Synthesizing:', { text, emotion, rate, pitch, volume });

    // Select voice based on emotion
    const voice = this.getVoiceForEmotion(emotion);

    try {
      // Call backend TTS endpoint
      console.log('[GoogleTTS] Calling backend:', `${this.apiUrl}/tts/synthesize`);
      const response = await fetch(`${this.apiUrl}/tts/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          speakingRate: rate,
          pitch,
          volumeGainDb: 0, // Google TTS uses dB gain, but we'll handle volume on client side for now
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[GoogleTTS] Backend error:', error);
        throw new Error(`TTS API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('[GoogleTTS] Received audio data, length:', data.audioContent?.length || 0);

      if (!data.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      // Decode base64 audio content
      const audioBytes = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = volume; // Apply client-side volume control

      let analyserNode: AnalyserNode | null = null;
      let sourceNode: MediaElementAudioSourceNode | null = null;
      let audioContextCreated = false;

      const play = async (): Promise<AnalyserNode> => {
        console.log('[GoogleTTS] play() called, audio duration:', audio.duration);

        // First, try to play the audio WITHOUT AudioContext (to catch autoplay errors)
        try {
          console.log('[GoogleTTS] Attempting to play audio');
          await audio.play();
          console.log('[GoogleTTS] Audio play successful');
        } catch (playError) {
          console.error('[GoogleTTS] Audio play failed:', playError);
          throw playError; // Re-throw the play error to VoicePrompt
        }

        // Audio is playing - now create AudioContext for analysis
        try {
          if (!audioContextCreated) {
            console.log('[GoogleTTS] Creating AudioContext and analysis nodes');

            if (!this.audioContext) {
              this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }

            const audioContext = this.audioContext;
            console.log('[GoogleTTS] AudioContext state:', audioContext.state);

            // Resume AudioContext if suspended
            if (audioContext.state === 'suspended') {
              console.log('[GoogleTTS] Resuming suspended AudioContext');
              await audioContext.resume().catch(err => {
                console.warn('[GoogleTTS] AudioContext resume warning (will use fallback):', err);
              });
              console.log('[GoogleTTS] AudioContext state after resume attempt:', audioContext.state);
            }

            // Create analyser and source node
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 256;
            analyserNode.smoothingTimeConstant = 0.8;

            sourceNode = audioContext.createMediaElementSource(audio);
            sourceNode.connect(analyserNode);
            analyserNode.connect(audioContext.destination);

            audioContextCreated = true;
            console.log('[GoogleTTS] Audio analysis pipeline created');
          }

          return analyserNode!;
        } catch (error) {
          console.error('[GoogleTTS] AudioContext creation error (audio will play without analysis):', error);
          // Don't throw - audio is already playing, just return a dummy analyser
          return null as unknown as AnalyserNode;
        }
      };

      const stop = () => {
        audio.pause();
        audio.currentTime = 0;
        if (sourceNode && analyserNode) {
          sourceNode.disconnect();
          analyserNode.disconnect();
        }
        URL.revokeObjectURL(audioUrl);
      };

      return { audio, play, stop };
    } catch (error) {
      console.error('Google TTS synthesis error:', error);
      throw error;
    }
  }

  private getVoiceForEmotion(_emotion: Emotion): string {
    // Check for user preference
    try {
      const savedVoice = localStorage.getItem('selectedVoice');
      if (savedVoice) {
        const voiceData = JSON.parse(savedVoice);
        if (voiceData && voiceData.name) {
          return voiceData.name;
        }
      }
    } catch (e) {
      console.warn('Failed to parse selected voice preference', e);
    }

    // Default fallback
    return 'en-US-Neural2-F';
  }

  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
