/**
 * Audio Service - Centralized audio playback management
 * Handles voice synthesis, autoplay permissions, and voice permission modals
 */

let voicePermissionModalCallback: (() => void) | null = null;
let currentAudio: HTMLAudioElement | null = null;
let pendingPlayback: PlayOptions | null = null;

// Web Audio API for visualization
let audioContext: AudioContext | null = null;
let audioAnalyser: AnalyserNode | null = null;
let audioSource: MediaElementAudioSourceNode | null = null;

interface PlayOptions {
  text: string;
  onStateChange?: (isPlaying: boolean) => void;
  onComplete?: () => void;
  voiceName?: string;
  onAnalyserReady?: (analyser: AnalyserNode | null) => void;
}

/**
 * Get the user's preferred voice from auth store or localStorage
 */
function getUserVoice(overrideVoiceName?: string): { name: string; volume: number } {
  console.log('[AudioService] getUserVoice called with overrideVoiceName:', overrideVoiceName);

  // If explicit voice name provided, use it
  if (overrideVoiceName) {
    console.log('[AudioService] Using override voice name:', overrideVoiceName);
    return { name: overrideVoiceName, volume: 1.0 };
  }

  // Try to get from auth store (persisted user preferences)
  const authStorage = localStorage.getItem('auth-storage');
  console.log('[AudioService] Auth storage raw:', authStorage?.substring(0, 200));

  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      console.log('[AudioService] Parsed auth storage user:', parsed.state?.user);

      if (parsed.state?.user?.voiceName) {
        const voiceData = parsed.state.user.voiceName;
        console.log('[AudioService] voiceData from auth store:', voiceData, 'Type:', typeof voiceData);

        let voiceName: string;

        if (typeof voiceData === 'string') {
          // Check if it's a JSON string that needs parsing
          try {
            const parsedVoice = JSON.parse(voiceData);
            voiceName = parsedVoice.id || parsedVoice.name || voiceData;
          } catch {
            // It's just a plain string voice ID
            voiceName = voiceData;
          }
        } else {
          // It's already an object
          voiceName = voiceData.id || voiceData.name;
        }

        console.log('[AudioService] Extracted voiceName:', voiceName);

        return {
          name: voiceName,
          volume: parsed.state.user.voiceVolume || 1.0,
        };
      }
    } catch (e) {
      console.warn('[AudioService] Failed to parse auth storage:', e);
    }
  }

  // Fallback to localStorage (temporary storage during onboarding)
  const storedVoice = localStorage.getItem('selectedVoice');
  const storedVolume = localStorage.getItem('voiceVolume');
  console.log('[AudioService] Fallback localStorage selectedVoice:', storedVoice);

  if (storedVoice) {
    try {
      const voice = JSON.parse(storedVoice);
      console.log('[AudioService] Parsed selectedVoice:', voice, 'Type:', typeof voice);

      let voiceName: string;

      if (typeof voice === 'string') {
        // Check if it's a double-encoded JSON string
        try {
          const parsedVoice = JSON.parse(voice);
          voiceName = parsedVoice.id || parsedVoice.name || voice;
        } catch {
          // It's just a plain string voice ID
          voiceName = voice;
        }
      } else {
        // It's an object
        voiceName = voice.id || voice.name;
      }

      console.log('[AudioService] Extracted voiceName from localStorage:', voiceName);

      return {
        name: voiceName,
        volume: storedVolume ? parseFloat(storedVolume) : 1.0,
      };
    } catch (e) {
      console.warn('[AudioService] Failed to parse selectedVoice:', e);
    }
  }

  // Ultimate fallback
  console.log('[AudioService] Using ultimate fallback voice');
  return { name: 'en-US-Neural2-D', volume: 1.0 };
}

/**
 * Get the audio analyser for visualization
 * Returns the analyser node that's connected to the current audio playback
 */
export function getAudioAnalyser(): AnalyserNode | null {
  return audioAnalyser;
}

/**
 * Initialize Web Audio API context and analyser
 */
function initializeAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 128; // Match ParticleWave's expected frequency data size
    audioAnalyser.smoothingTimeConstant = 0.8;
  }
}

/**
 * Register a callback to show the voice permission modal
 * This should be called once from the root App component
 */
export function setVoicePermissionModalHandler(handler: () => void) {
  voicePermissionModalCallback = handler;
}

/**
 * Retry the last failed playback (called after user grants permission)
 */
export async function retryPendingPlayback(): Promise<boolean> {
  if (!pendingPlayback) {
    return false;
  }

  const options = pendingPlayback;
  pendingPlayback = null;
  return playVoice(options);
}

/**
 * Play text using TTS with automatic permission handling and retry logic
 */
export async function playVoice(options: PlayOptions): Promise<boolean> {
  const { text, onStateChange, onComplete, voiceName } = options;

  try {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    onStateChange?.(true);

    // Get voice preference (user's saved voice > provided voiceName > default)
    const userVoice = getUserVoice(voiceName);

    console.log('[AudioService] Playing voice with:', { text, voice: userVoice.name, volume: userVoice.volume });
    console.log('[AudioService] Voice name type:', typeof userVoice.name);
    console.log('[AudioService] Voice name value:', userVoice.name);

    // Call TTS API
    const response = await fetch('http://localhost:5001/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: userVoice.name,
        languageCode: userVoice.name.split('-').slice(0, 2).join('-'),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'TTS service unavailable' }));
      console.error('[AudioService] TTS Error:', errorData);
      throw new Error(errorData.error || 'TTS request failed');
    }

    const data = await response.json();
    if (!data.audioContent) {
      throw new Error('No audio content received');
    }

    // Decode and create audio
    const audioData = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    audio.volume = userVoice.volume; // Apply user's volume preference
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      onStateChange?.(false);
      options.onAnalyserReady?.(null); // Clear analyser when audio ends
      currentAudio = null;
      onComplete?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      onStateChange?.(false);
      options.onAnalyserReady?.(null); // Clear analyser on error
      currentAudio = null;
      onComplete?.();
    };

    // Try to play first (to catch autoplay errors before setting up AudioContext)
    await audio.play();
    console.log('[AudioService] Playback started successfully');

    // Audio is playing - now create AudioContext for visualization
    initializeAudioContext();

    // Connect audio element to analyser
    if (audioContext && audioAnalyser) {
      try {
        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);
        console.log('[AudioService] Audio analyser connected');

        // Notify that analyser is ready (after successful play and connection)
        options.onAnalyserReady?.(audioAnalyser);
      } catch (error) {
        console.warn('[AudioService] Failed to connect audio analyser:', error);
        // Audio will still play, just without visualization
      }
    }

    return true;

  } catch (error) {
    console.error('[AudioService] Playback error:', error);
    // DON'T call onStateChange(false) here - we're not done speaking, we're retrying!
    // onStateChange should only be called when audio actually starts/ends, not on errors

    // Check if it's an autoplay permission error
    if (error instanceof Error &&
        (error.name === 'NotAllowedError' ||
         error.message.includes('play()') ||
         error.message.includes('user didn\'t interact'))) {

      console.log('[AudioService] Permission denied, saving for retry');
      // Save for retry after user grants permission
      pendingPlayback = options;

      // Show voice permission modal if available
      if (voicePermissionModalCallback) {
        voicePermissionModalCallback();
      }
    } else {
      // For other non-retry errors, we're actually done (failed)
      onStateChange?.(false);
      onComplete?.();
    }

    return false;
  }
}

/**
 * Stop any currently playing audio
 */
export function stopVoice() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
