import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ParticleEmotion } from './AuthStateMachine';
import AzureTTSService, { type Emotion as AzureEmotion } from '../../services/azureTTS';
import GoogleTTSService, { type Emotion as GoogleEmotion } from '../../services/googleTTS';

interface VoicePromptProps {
  text: string;
  emotion: ParticleEmotion;
  onComplete?: () => void;
  autoSpeak?: boolean;
  onPermissionDenied?: () => void;
  onAudioAnalyser?: (analyser: AnalyserNode | null) => void;
  voiceEnabled?: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

// Singleton instances
let azureTTS: AzureTTSService | null = null;
let googleTTS: GoogleTTSService | null = null;

function getAzureTTS(): AzureTTSService {
  if (!azureTTS) {
    const subscriptionKey = import.meta.env.VITE_AZURE_SPEECH_KEY || '';
    const region = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus';
    azureTTS = new AzureTTSService({ subscriptionKey, region });
  }
  return azureTTS;
}

function getGoogleTTS(): GoogleTTSService {
  if (!googleTTS) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    googleTTS = new GoogleTTSService({ apiUrl });
  }
  return googleTTS;
}

// Map particle emotions to TTS emotions
function mapEmotionForAzure(emotion: ParticleEmotion): AzureEmotion {
  switch (emotion) {
    case 'happy':
    case 'success':
      return 'happy';
    case 'error':
      return 'sad';
    case 'listening':
      return 'calm';
    case 'idle':
    default:
      return 'neutral';
  }
}

function mapEmotionForGoogle(emotion: ParticleEmotion): GoogleEmotion {
  switch (emotion) {
    case 'happy':
    case 'success':
      return 'happy';
    case 'error':
      return 'sad';
    case 'listening':
      return 'calm';
    case 'idle':
    default:
      return 'neutral';
  }
}

export function VoicePrompt({
  text,
  emotion,
  onComplete,
  autoSpeak = true,
  onPermissionDenied,
  onAudioAnalyser,
  voiceEnabled = true,
  onSpeakingChange
}: VoicePromptProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<{ stop: () => void } | null>(null);
  const isMountedRef = useRef(true);

  console.log('[VoicePrompt] Component rendered/updated:', { text, autoSpeak, voiceEnabled });

  // Update parent when speaking state changes
  const updateSpeaking = (speaking: boolean) => {
    setIsSpeaking(speaking);
    onSpeakingChange?.(speaking);
  };

  useEffect(() => {
    // Reset mounted flag
    isMountedRef.current = true;
    let isCleanedUp = false;

    if (!voiceEnabled || !autoSpeak || !text) {
      return;
    }

    // Check which TTS service to use (priority: Google > Azure > Web Speech)
    const hasGoogle = true; // Always available via backend
    const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const hasAzure = azureKey && azureKey !== 'your_azure_speech_key_here' && azureKey.length > 10;

    if (hasGoogle) {
      // Use Google TTS (best option - provides audio analyser)
      console.log('[VoicePrompt] Using Google TTS, text:', text);
      const tts = getGoogleTTS();
      const speakAsync = async () => {
        if (isCleanedUp) {
          console.log('[VoicePrompt] Already cleaned up, aborting');
          return;
        }

        try {
          const googleEmotion = mapEmotionForGoogle(emotion);
          const speechOptions = {
            text,
            emotion: googleEmotion,
            rate: emotion === 'happy' ? 1.1 : emotion === 'error' ? 0.9 : 1.0,
            pitch: emotion === 'happy' ? 10 : emotion === 'error' ? -10 : 0,
          };

          console.log('[VoicePrompt] Synthesizing with options:', speechOptions);
          const audio = await tts.synthesize(speechOptions);
          console.log('[VoicePrompt] Synthesis complete');
          if (isCleanedUp) return;

          currentAudioRef.current = audio;

          await new Promise(resolve => setTimeout(resolve, 300));
          if (isCleanedUp) {
            console.log('[VoicePrompt] Cleaned up before play');
            return;
          }

          console.log('[VoicePrompt] Setting speaking=true, calling audio.play()');
          updateSpeaking(true);
          const analyser = await audio.play();
          console.log('[VoicePrompt] Audio playing, analyser:', analyser);
          onAudioAnalyser?.(analyser);

          const duration = audio.audio.duration * 1000;
          console.log('[VoicePrompt] Waiting for audio completion, duration:', duration);
          await new Promise(resolve => setTimeout(resolve, duration));

          if (!isCleanedUp) {
            console.log('[VoicePrompt] Audio complete, cleaning up');
            updateSpeaking(false);
            onAudioAnalyser?.(null);
            currentAudioRef.current = null;
            onComplete?.();
          }

        } catch (error) {
          console.error('[VoicePrompt] Google TTS error:', error);

          // Check if it's a permission/autoplay error
          if (error instanceof Error &&
              (error.name === 'NotAllowedError' ||
               error.message.includes('play()') ||
               error.message.includes('user didn\'t interact'))) {
            console.log('[VoicePrompt] Permission denied, triggering modal');
            onPermissionDenied?.();
          }

          if (!isCleanedUp) {
            updateSpeaking(false);
            onAudioAnalyser?.(null);
            onComplete?.();
          }
        }
      };
      speakAsync();
    } else if (hasAzure) {
      // Use Azure TTS (fallback option)
      const tts = getAzureTTS();
      const speakAsync = async () => {
        if (isCleanedUp) return;

        try {
          const azureEmotion = mapEmotionForAzure(emotion);
          const speechOptions = {
            text,
            emotion: azureEmotion,
            rate: emotion === 'happy' ? 1.1 : emotion === 'error' ? 0.9 : 1.0,
            pitch: emotion === 'happy' ? 10 : emotion === 'error' ? -10 : 0,
          };

          const audio = await tts.synthesize(speechOptions);
          if (isCleanedUp) return;

          currentAudioRef.current = audio;

          await new Promise(resolve => setTimeout(resolve, 300));
          if (isCleanedUp) return;

          updateSpeaking(true);
          const analyser = await audio.play();
          onAudioAnalyser?.(analyser);

          const duration = audio.audio.duration * 1000;
          await new Promise(resolve => setTimeout(resolve, duration));

          if (!isCleanedUp) {
            updateSpeaking(false);
            onAudioAnalyser?.(null);
            currentAudioRef.current = null;
            onComplete?.();
          }

        } catch (error) {
          console.error('Azure TTS error:', error);
          if (!isCleanedUp) {
            updateSpeaking(false);
            onAudioAnalyser?.(null);
            // Don't fallback - just complete
            onComplete?.();
          }
        }
      };
      speakAsync();
    } else {
      // Use Web Speech API directly (no Azure)
      const timer = setTimeout(() => {
        if (isCleanedUp) {
          return;
        }
        updateSpeaking(true);
        fallbackToWebSpeech(text, emotion, () => {
          if (!isCleanedUp) {
            updateSpeaking(false);
            onComplete?.();
          }
        }, onPermissionDenied);
      }, 300);

      return () => {
        isCleanedUp = true;
        clearTimeout(timer);
        // Clean up on unmount - cancel any speech
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Stop Web Speech API
        }
        updateSpeaking(false);
      };
    }    return () => {
      // Mark as cleaned up to prevent async operations from continuing
      isCleanedUp = true;
      isMountedRef.current = false;

      // Clean up on unmount - cancel any speech
      if (currentAudioRef.current) {
        currentAudioRef.current.stop();
        currentAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop Web Speech API
      }
      updateSpeaking(false);
      onAudioAnalyser?.(null);
    };
  }, [text, emotion, autoSpeak, voiceEnabled, onComplete, onAudioAnalyser, onSpeakingChange]);

  if (!text) return null;

  return (
    <motion.div
      className="fixed top-8 left-1/2 -translate-x-1/2 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className={`
          px-6 py-3 rounded-full
          bg-gray-900/95 backdrop-blur-md
          border-2 transition-all duration-300 shadow-lg
          ${
            emotion === 'error'
              ? 'border-red-500/70 shadow-red-500/20'
              : emotion === 'success'
                ? 'border-green-500/70 shadow-green-500/20'
                : emotion === 'listening'
                  ? 'border-primary-500/70 shadow-primary-500/20'
                  : 'border-gray-600/50'
          }
        `}
      >
        <div className="flex items-center gap-3">
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-1">
              <motion.div
                className="w-1 h-3 bg-primary-400 rounded-full"
                animate={{ scaleY: [1, 1.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-1 h-3 bg-primary-400 rounded-full"
                animate={{ scaleY: [1, 1.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
              />
              <motion.div
                className="w-1 h-3 bg-primary-400 rounded-full"
                animate={{ scaleY: [1, 1.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
              />
            </div>
          )}

          {/* Prompt text */}
          <p className="text-sm font-semibold text-white">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Fallback to browser Web Speech API if Azure fails
function fallbackToWebSpeech(text: string, emotion: ParticleEmotion, onComplete?: () => void, onPermissionDenied?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onComplete?.();
    return;
  }

  const synth = window.speechSynthesis;

  // Check voices availability immediately
  const initialVoices = synth.getVoices();
  if (initialVoices.length === 0) {
    console.warn('No voices loaded yet - waiting for voiceschanged event');
    // Wait for voices to load
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        synth.removeEventListener('voiceschanged', loadVoices);
        // Retry the speech after voices are loaded
        fallbackToWebSpeech(text, emotion, onComplete);
      }
    };
    synth.addEventListener('voiceschanged', loadVoices);
    return;
  }

  // Cancel any previous speech first
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Adjust parameters based on emotion
  switch (emotion) {
    case 'happy':
    case 'success':
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      break;
    case 'error':
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      break;
    default:
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
  }

  utterance.onstart = () => {
  };
  utterance.onend = () => {
    onComplete?.();
  };
  utterance.onerror = (event) => {
    console.error('Speech error event:', event);
    console.error('Error details:', { error: event.error, charIndex: event.charIndex });

    // If permission denied, trigger the permission modal
    if (event.error === 'not-allowed') {
      onPermissionDenied?.();
    }

    onComplete?.();
  };

  synth.speak(utterance);

  // Check available voices
  const voices = synth.getVoices();
  if (voices.length > 0) {
  } else {
    console.warn('No voices available - this may be the issue!');
  }
}
