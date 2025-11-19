import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ParticleEmotion } from './AuthStateMachine';

interface VoicePromptProps {
  text: string;
  emotion: ParticleEmotion;
  onComplete?: () => void;
  autoSpeak?: boolean;
  onPermissionDenied?: () => void;
}

// Voice synthesis utility
class VoiceSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private permissionGranted: boolean = false;
  private permissionRequested: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoice();
    }
  }

  private loadVoice() {
    if (!this.synth) return;

    const loadVoices = () => {
      const voices = this.synth!.getVoices();

      // Prefer natural-sounding voices
      const preferredVoices = [
        'Microsoft Zira - English (United States)',
        'Google US English',
        'Samantha',
        'Karen',
        'Daniel',
      ];

      for (const preferred of preferredVoices) {
        const voice = voices.find((v) => v.name.includes(preferred));
        if (voice) {
          this.voice = voice;
          return;
        }
      }

      // Fallback to first English voice
      this.voice = voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
    };

    if (this.synth.getVoices().length > 0) {
      loadVoices();
    } else {
      this.synth.addEventListener('voiceschanged', loadVoices);
    }
  }

  speak(text: string, emotion: ParticleEmotion, onComplete?: () => void, onError?: (error: string) => void) {
    if (!this.synth || !text) return;

    // Cancel any ongoing speech
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (this.voice) {
      utterance.voice = this.voice;
    }

    // Adjust speech parameters based on emotion
    switch (emotion) {
      case 'happy':
      case 'success':
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        utterance.volume = 1.0;
        break;
      case 'error':
        utterance.rate = 0.9;
        utterance.pitch = 0.8;
        utterance.volume = 0.9;
        break;
      case 'listening':
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        utterance.volume = 0.95;
        break;
      case 'idle':
      default:
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        break;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      onComplete?.();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.currentUtterance = null;
      
      if (event.error === 'not-allowed') {
        this.permissionGranted = false;
        onError?.('not-allowed');
      }
      
      onComplete?.();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  cancel() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return this.synth?.speaking || false;
  }
}

// Singleton instance
let voiceSynthesizer: VoiceSynthesizer | null = null;

function getVoiceSynthesizer(): VoiceSynthesizer {
  if (!voiceSynthesizer) {
    voiceSynthesizer = new VoiceSynthesizer();
  }
  return voiceSynthesizer;
}

export function VoicePrompt({ text, emotion, onComplete, autoSpeak = true, onPermissionDenied }: VoicePromptProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    if (autoSpeak && text && !hasSpokenRef.current) {
      hasSpokenRef.current = true;
      const synth = getVoiceSynthesizer();
      
      // Small delay for better UX
      const timer = setTimeout(() => {
        setIsSpeaking(true);
        synth.speak(text, emotion, () => {
          setIsSpeaking(false);
          onComplete?.();
        }, (error) => {
          if (error === 'not-allowed') {
            setPermissionError(true);
            onPermissionDenied?.();
          }
          setIsSpeaking(false);
        });
      }, 300);      return () => {
        clearTimeout(timer);
        synth.cancel();
        setIsSpeaking(false);
      };
    }
  }, [text, emotion, autoSpeak, onComplete]);

  // Reset spoken flag when text changes
  useEffect(() => {
    hasSpokenRef.current = false;
    setPermissionError(false);
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

// Export utility for manual control
export function useVoiceSynthesis() {
  const synth = getVoiceSynthesizer();

  return {
    speak: (text: string, emotion: ParticleEmotion = 'idle', onComplete?: () => void, onError?: (error: string) => void) => {
      synth.speak(text, emotion, onComplete, onError);
    },
    cancel: () => {
      synth.cancel();
    },
    isSpeaking: () => {
      return synth.isSpeaking();
    },
  };
}
