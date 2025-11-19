/**
 * Custom hook for Web Audio API frequency analysis
 * Provides real-time frequency data for particle visualization
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface AudioData {
  frequencies: Uint8Array; // Frequency data (0-255)
  timeDomain: Uint8Array;  // Waveform data (0-255)
  volume: number;          // Average volume (0-1)
  bass: number;            // Bass frequencies (0-1)
  mids: number;            // Mid frequencies (0-1)
  treble: number;          // High frequencies (0-1)
}

interface UseAudioAnalyserReturn {
  audioData: AudioData | null;
  setAnalyser: (analyser: AnalyserNode | null) => void;
  isActive: boolean;
}

/**
 * Hook to analyze audio in real-time
 * Returns frequency bands and waveform data for visualization
 */
export function useAudioAnalyser(): UseAudioAnalyserReturn {
  const [analyser, setAnalyserState] = useState<AnalyserNode | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frequenciesRef = useRef<Uint8Array>(new Uint8Array(0));
  const timeDomainRef = useRef<Uint8Array>(new Uint8Array(0));

  const setAnalyser = useCallback((newAnalyser: AnalyserNode | null) => {
    setAnalyserState(newAnalyser);
    setIsActive(!!newAnalyser);
  }, []);

  useEffect(() => {
    if (!analyser) {
      // Clean up when analyser is removed
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Initialize buffers
    const bufferLength = analyser.frequencyBinCount;
    const frequencies = new Uint8Array(bufferLength);
    const timeDomain = new Uint8Array(bufferLength);
    frequenciesRef.current = frequencies;
    timeDomainRef.current = timeDomain;

    const updateAudioData = () => {
      if (!analyser || frequenciesRef.current.length === 0 || timeDomainRef.current.length === 0) {
        return;
      }

      const frequencies = frequenciesRef.current;
      const timeDomain = timeDomainRef.current;

      // Get frequency and waveform data
      // @ts-expect-error - TypeScript ArrayBuffer vs ArrayBufferLike issue
      analyser.getByteFrequencyData(frequencies);
      // @ts-expect-error - TypeScript ArrayBuffer vs ArrayBufferLike issue
      analyser.getByteTimeDomainData(timeDomain);

      // Calculate volume (RMS of waveform)
      const rms = Math.sqrt(
        Array.from(timeDomain).reduce((sum, val) => {
          const normalized = (val - 128) / 128;
          return sum + normalized * normalized;
        }, 0) / timeDomain.length
      );

      // Split frequency spectrum into bands
      const third = Math.floor(frequencies.length / 3);

      // Bass: Low frequencies (0-33%)
      const bassSum = Array.from(frequencies.slice(0, third)).reduce((a, b) => a + b, 0);
      const bass = bassSum / (third * 255);

      // Mids: Mid frequencies (33-66%)
      const midsSum = Array.from(frequencies.slice(third, third * 2)).reduce((a, b) => a + b, 0);
      const mids = midsSum / (third * 255);

      // Treble: High frequencies (66-100%)
      const trebleSum = Array.from(frequencies.slice(third * 2)).reduce((a, b) => a + b, 0);
      const treble = trebleSum / ((frequencies.length - third * 2) * 255);

      setAudioData({
        frequencies: new Uint8Array(frequencies),
        timeDomain: new Uint8Array(timeDomain),
        volume: rms,
        bass,
        mids,
        treble,
      });

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    };

    // Start animation loop
    updateAudioData();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser]);

  return { audioData, setAnalyser, isActive };
}
