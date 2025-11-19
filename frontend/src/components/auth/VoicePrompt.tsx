import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ParticleEmotion } from './AuthStateMachine';
import AzureTTSService, { type Emotion } from '../../services/azureTTS';

interface VoicePromptProps {
  text: string;
  emotion: ParticleEmotion;
  onComplete?: () => void;
  autoSpeak?: boolean;
  onPermissionDenied?: () => void;
  onAudioAnalyser?: (analyser: AnalyserNode | null) => void;
  voiceEnabled?: boolean;
}

// Singleton Azure TTS instance
let azureTTS: AzureTTSService | null = null;

function getAzureTTS(): AzureTTSService {
  if (!azureTTS) {
    const subscriptionKey = import.meta.env.VITE_AZURE_SPEECH_KEY || '';
    const region = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus';

    if (!subscriptionKey) {
      console.warn('Azure Speech key not configured, voice will be disabled');
    }

    azureTTS = new AzureTTSService({ subscriptionKey, region });
  }
  return azureTTS;
}

// Map particle emotions to Azure emotions
function mapEmotion(emotion: ParticleEmotion): Emotion {
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
  voiceEnabled = true
}: VoicePromptProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasSpokenRef = useRef(false);
  const currentAudioRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!voiceEnabled || !autoSpeak || !text || hasSpokenRef.current) {
      return;
    }

    hasSpokenRef.current = true;
    const tts = getAzureTTS();

    const speakAsync = async () => {
      try {
        // Synthesize speech
        const azureEmotion = mapEmotion(emotion);
        const speechOptions = {
          text,
          emotion: azureEmotion,
          rate: emotion === 'happy' ? 1.1 : emotion === 'error' ? 0.9 : 1.0,
          pitch: emotion === 'happy' ? 10 : emotion === 'error' ? -10 : 0,
        };

        const audio = await tts.synthesize(speechOptions);
        currentAudioRef.current = audio;

        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));

        // Play and get analyser for visualization
        setIsSpeaking(true);
        const analyser = await audio.play();

        // Pass analyser to parent for visualization
        onAudioAnalyser?.(analyser);

        // Wait for playback to complete
        const duration = audio.audio.duration * 1000;
        await new Promise(resolve => setTimeout(resolve, duration));

        // Clean up
        setIsSpeaking(false);
        onAudioAnalyser?.(null);
        currentAudioRef.current = null;
        onComplete?.();

      } catch (error) {
        console.error('Azure TTS error:', error);
        setIsSpeaking(false);
        onAudioAnalyser?.(null);
        onPermissionDenied?.();

        // Fallback to browser speech synthesis if Azure fails
        fallbackToWebSpeech(text, emotion, onComplete);
      }
    };

    speakAsync();

    return () => {
      // Clean up on unmount
      if (currentAudioRef.current) {
        currentAudioRef.current.stop();
        currentAudioRef.current = null;
      }
      setIsSpeaking(false);
      onAudioAnalyser?.(null);
    };
  }, [text, emotion, autoSpeak, voiceEnabled, onComplete, onAudioAnalyser, onPermissionDenied]);

  // Reset spoken flag when text changes
  useEffect(() => {
    hasSpokenRef.current = false;
  }, [text]);

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
function fallbackToWebSpeech(text: string, emotion: ParticleEmotion, onComplete?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onComplete?.();
    return;
  }

  const synth = window.speechSynthesis;
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

  utterance.onend = () => onComplete?.();
  utterance.onerror = () => onComplete?.();

  synth.speak(utterance);
}
