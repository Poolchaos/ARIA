/**
 * Audio Service - Centralized audio playback management
 * Handles voice synthesis, autoplay permissions, and voice permission modals
 */

let voicePermissionModalCallback: (() => void) | null = null;
let currentAudio: HTMLAudioElement | null = null;
let pendingPlayback: PlayOptions | null = null;

interface PlayOptions {
  text: string;
  onStateChange?: (isPlaying: boolean) => void;
  onComplete?: () => void;
  voiceName?: string;
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

    // Get voice from localStorage or use provided voiceName
    const storedVoice = localStorage.getItem('selectedVoice');
    const voice = voiceName
      ? { name: voiceName }
      : storedVoice
        ? JSON.parse(storedVoice)
        : { name: 'en-US-Neural2-D' };

    console.log('[AudioService] Playing voice with:', { text, voice: voice.name });

    // Call TTS API
    const response = await fetch('http://localhost:5001/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: voice.name,
        languageCode: voice.name.split('-').slice(0, 2).join('-'),
      }),
    });

    if (!response.ok) {
      throw new Error('TTS request failed');
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
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      onStateChange?.(false);
      currentAudio = null;
      onComplete?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      onStateChange?.(false);
      currentAudio = null;
      onComplete?.();
    };

    // Try to play
    await audio.play();
    console.log('[AudioService] Playback started successfully');
    return true;

  } catch (error) {
    console.error('[AudioService] Playback error:', error);
    onStateChange?.(false);

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
      // For other errors, call onComplete
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
