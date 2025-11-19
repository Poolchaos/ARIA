import { useEffect, useRef, useCallback, useState } from 'react';
import { MicVAD } from '@ricky0123/vad-web';

interface VoiceActivityDetectionOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVADMisfire?: () => void;
  enabled?: boolean;
}

export function useVoiceActivityDetection({
  onSpeechStart,
  onSpeechEnd,
  onVADMisfire,
  enabled = false,
}: VoiceActivityDetectionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vadRef = useRef<MicVAD | null>(null);

  const start = useCallback(async () => {
    if (vadRef.current || !enabled) return;

    try {
      const vad = await MicVAD.new({
        onSpeechStart: () => {
          setIsSpeaking(true);
          onSpeechStart?.();
        },
        onSpeechEnd: () => {
          setIsSpeaking(false);
          onSpeechEnd?.();
        },
        onVADMisfire: () => {
          onVADMisfire?.();
        },
        positiveSpeechThreshold: 0.7, // Higher = less sensitive to false positives
        negativeSpeechThreshold: 0.35, // Lower = faster to detect speech end
        redemptionFrames: 8, // Frames to wait before ending speech (prevents choppy detection)
      });

      vadRef.current = vad;
      vad.start();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start VAD:', error);
    }
  }, [enabled, onSpeechStart, onSpeechEnd, onVADMisfire]);

  const stop = useCallback(() => {
    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
      setIsListening(false);
      setIsSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (vadRef.current) {
      vadRef.current.pause();
      setIsListening(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (vadRef.current) {
      vadRef.current.start();
      setIsListening(true);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      const timer = setTimeout(() => start().catch(console.error), 0);
      return () => {
        clearTimeout(timer);
        stop();
      };
    }

    const timer = setTimeout(() => stop(), 0);
    return () => clearTimeout(timer);
  }, [enabled, start, stop]);

  return {
    isListening,
    isSpeaking,
    start,
    stop,
    pause,
    resume,
  };
}
