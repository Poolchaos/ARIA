import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel?: number;
}

export function VoiceVisualizer({ isActive, audioLevel = 0 }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Initialize particles
    const particleCount = 150;
    particlesRef.current = Array.from({ length: particleCount }, () => new Particle(
      canvas.offsetWidth,
      canvas.offsetHeight
    ));

    const animate = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      timeRef.current += 0.01;
      const intensity = isActive ? 1 + audioLevel * 2 : 0.3;

      // Update and draw particles
      particlesRef.current.forEach(particle => {
        particle.update(timeRef.current, intensity, width, height);
        particle.draw(ctx, width, height);
      });

      // Draw connections
      ctx.strokeStyle = `rgba(14, 165, 233, ${0.15 * intensity})`;
      ctx.lineWidth = 1;

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            const opacity = (1 - distance / 100) * 0.2 * intensity;
            ctx.strokeStyle = `rgba(14, 165, 233, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', updateSize);
    };
  }, [isActive, audioLevel]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full h-full"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Center glow effect */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.2, 1] : 1,
          opacity: isActive ? [0.3, 0.6, 0.3] : 0.1,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500 rounded-full blur-3xl"
      />
    </motion.div>
  );
}

class Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.baseX = this.x;
    this.baseY = this.y;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.size = Math.random() * 2 + 1;
    this.angle = Math.random() * Math.PI * 2;
  }

  update(time: number, intensity: number, width: number, height: number) {
    // Circular motion around base position
    const radius = 30 * intensity;
    this.x = this.baseX + Math.cos(this.angle + time) * radius;
    this.y = this.baseY + Math.sin(this.angle + time * 1.2) * radius;

    // Gentle drift
    this.baseX += this.vx;
    this.baseY += this.vy;

    // Wrap around edges
    if (this.baseX < 0) this.baseX = width;
    if (this.baseX > width) this.baseX = 0;
    if (this.baseY < 0) this.baseY = height;
    if (this.baseY > height) this.baseY = 0;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Distance from center affects opacity
    const centerX = width / 2;
    const centerY = height / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(this.x - centerX, 2) + Math.pow(this.y - centerY, 2)
    );
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    const opacity = Math.max(0.1, 1 - distanceFromCenter / maxDistance);

    ctx.fillStyle = `rgba(14, 165, 233, ${opacity * 0.6})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
