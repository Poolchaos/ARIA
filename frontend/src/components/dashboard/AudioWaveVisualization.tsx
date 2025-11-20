import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioWaveVisualizationProps {
  isSpeaking: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  size?: 'small' | 'medium' | 'large';
}

export function AudioWaveVisualization({
  isSpeaking,
  primaryColor = '#0ea5e9',
  secondaryColor = '#3b82f6',
  size = 'medium',
}: AudioWaveVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const sizeConfig = {
    small: { width: 200, height: 100, bars: 20 },
    medium: { width: 300, height: 150, bars: 30 },
    large: { width: 400, height: 200, bars: 40 },
  };

  const config = sizeConfig[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / config.bars;
      const centerY = canvas.height / 2;

      for (let i = 0; i < config.bars; i++) {
        const x = i * barWidth + barWidth / 2;

        // Create wave pattern
        const baseHeight = isSpeaking
          ? Math.sin((i * 0.2) + phase) * 20 + Math.random() * 30
          : Math.sin((i * 0.15) + phase * 0.5) * 5 + 2;

        const height = Math.max(2, Math.abs(baseHeight));

        // Gradient from primary to secondary color
        const gradient = ctx.createLinearGradient(0, centerY - height, 0, centerY + height);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, secondaryColor);

        ctx.fillStyle = gradient;
        ctx.shadowBlur = isSpeaking ? 10 : 5;
        ctx.shadowColor = primaryColor;

        // Draw bar
        ctx.fillRect(
          x - barWidth * 0.4,
          centerY - height,
          barWidth * 0.8,
          height * 2
        );
      }

      phase += isSpeaking ? 0.15 : 0.05;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpeaking, primaryColor, secondaryColor, config.bars]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        width={config.width}
        height={config.height}
        className="rounded-lg"
        style={{
          background: 'radial-gradient(circle, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
      {isSpeaking && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          animate={{
            boxShadow: [
              `0 0 20px ${primaryColor}40`,
              `0 0 40px ${primaryColor}60`,
              `0 0 20px ${primaryColor}40`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
}
