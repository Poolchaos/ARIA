import { useEffect, useRef } from 'react';

interface ParticleWaveProps {
  isSpeaking?: boolean;
  emotion?: 'idle' | 'happy' | 'listening' | 'error' | 'success';
  className?: string;
  audioAnalyser?: AnalyserNode | null;
}

/**
 * Canvas-based horizontal audio waveform visualizer
 * Similar to professional soundwave animations
 */
export function ParticleWave({ isSpeaking = false, emotion = 'idle', className = '', audioAnalyser = null }: ParticleWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const barWidthsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    let dataArray: Uint8Array<ArrayBuffer> | null = null;
    if (audioAnalyser) {
      dataArray = new Uint8Array(audioAnalyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }

    const barCount = 60;

    // Initialize random bar widths once
    if (barWidthsRef.current.length === 0) {
      for (let i = 0; i < barCount; i++) {
        barWidthsRef.current.push(0.2 + Math.random() * 0.8); // Random between 0.2 and 1.0 as multiplier
      }
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Get audio data
      let frequencies: number[] = [];
      if (audioAnalyser && dataArray) {
        audioAnalyser.getByteFrequencyData(dataArray);
        frequencies = Array.from(dataArray);
      }

      const centerY = rect.height / 2;
      const visualWidth = Math.min(rect.width * 0.7, 700);
      const startX = (rect.width - visualWidth) / 2;
      const barWidth = visualWidth / barCount;
      const barSpacing = barWidth * 0.6;
      const maxBarWidth = barWidth - barSpacing;

      // Draw bars with gradient colors
      for (let i = 0; i < barCount; i++) {
        let barHeight = 4; // Minimum height when idle

        // Only animate if we have real audio data
        if (frequencies.length > 0 && isSpeaking && audioAnalyser) {
          // Create symmetric pattern from center
          const centerIndex = barCount / 2;
          const distanceFromCenter = Math.abs(i - centerIndex);
          const freqIndex = Math.floor((distanceFromCenter / centerIndex) * (frequencies.length / 2));
          const amplitude = frequencies[freqIndex] || 0;
          barHeight = (amplitude / 255) * (rect.height * 0.3); // Reduced to 60% (0.5 * 0.6 = 0.3)
        }
        // No fallback animation - stay at minimum height if no audio data

        const x = startX + i * barWidth;
        const y = centerY - barHeight / 2;

        // Random bar width - scale from 1px to max
        const widthMultiplier = barWidthsRef.current[i];
        const actualBarWidth = Math.max(1, maxBarWidth * widthMultiplier);

        // Calculate color gradient: hot pink -> magenta -> electric orange -> bright yellow
        const progress = i / barCount;
        let barColor;

        if (progress < 0.33) {
          // Hot pink to magenta
          const localProgress = progress / 0.33;
          barColor = `rgb(${255}, ${20 + localProgress * 20}, ${147 + localProgress * 108})`; // FF14FF to FF28FF
        } else if (progress < 0.66) {
          // Magenta to electric orange
          const localProgress = (progress - 0.33) / 0.33;
          barColor = `rgb(${255}, ${40 + localProgress * 100}, ${255 - localProgress * 255})`; // FF28FF to FF8C00
        } else {
          // Electric orange to bright yellow
          const localProgress = (progress - 0.66) / 0.34;
          barColor = `rgb(${255}, ${140 + localProgress * 115}, ${localProgress * 0})`; // FF8C00 to FFFF00
        }

        // Opacity based on distance from center (fade out at edges)
        const centerIndex = barCount / 2;
        const distanceFromCenter = Math.abs(i - centerIndex) / centerIndex;
        const opacity = 1 - (distanceFromCenter * 0.7); // Fade to 30% at edges

        ctx.fillStyle = barColor;
        ctx.globalAlpha = opacity;

        // Strong glow at center
        if (distanceFromCenter < 0.3) {
          ctx.shadowBlur = 30;
          ctx.shadowColor = barColor;
        } else {
          ctx.shadowBlur = 10;
          ctx.shadowColor = barColor;
        }

        // Draw bar
        ctx.beginPath();
        ctx.roundRect(x, y, actualBarWidth, barHeight, actualBarWidth / 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1; // Reset

      animationFrameRef.current = requestAnimationFrame(draw);
    };    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpeaking, audioAnalyser, emotion]);

  return (
    <div className={`w-full h-full ${className}`} style={{
      background: 'transparent',
    }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          filter: 'brightness(1.2)',
        }}
      />
    </div>
  );
}
