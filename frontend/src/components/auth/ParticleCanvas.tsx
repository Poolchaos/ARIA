import { useRef, useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  alpha: number;
}

export type ParticleFormation = 'face' | 'field' | 'button' | 'scattered' | 'loading';
export type ParticleEmotion = 'idle' | 'happy' | 'listening' | 'error' | 'success';

interface ParticleCanvasProps {
  formation?: ParticleFormation;
  emotion?: ParticleEmotion;
  audioLevel?: number;
  className?: string;
}

export function ParticleCanvas({
  formation = 'face',
  emotion = 'idle',
  audioLevel = 0,
  className = '',
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Formation calculation helper functions
  const calculateFaceFormation = useCallback((particles: Particle[], cx: number, cy: number) => {
    const faceRadius = 100;
    const eyeRadius = 20;
    const mouthRadius = 60;

    particles.forEach((p, i) => {
      const ratio = i / particles.length;

      if (ratio < 0.4) {
        // Face outline (circle)
        const angle = ratio * Math.PI * 2 * 2.5;
        p.targetX = cx + Math.cos(angle) * faceRadius;
        p.targetY = cy + Math.sin(angle) * faceRadius;
      } else if (ratio < 0.55) {
        // Left eye
        const angle = (ratio - 0.4) * Math.PI * 2 * 6;
        p.targetX = cx - 40 + Math.cos(angle) * eyeRadius;
        p.targetY = cy - 30 + Math.sin(angle) * eyeRadius;
      } else if (ratio < 0.7) {
        // Right eye
        const angle = (ratio - 0.55) * Math.PI * 2 * 6;
        p.targetX = cx + 40 + Math.cos(angle) * eyeRadius;
        p.targetY = cy - 30 + Math.sin(angle) * eyeRadius;
      } else {
        // Smile (arc)
        const smileEmotion = emotion === 'happy' || emotion === 'success' ? 1.2 : 0.8;
        const angle = Math.PI * 0.2 + (ratio - 0.7) * Math.PI * 0.6;
        p.targetX = cx + Math.cos(angle) * mouthRadius;
        p.targetY = cy + 20 + Math.sin(angle) * mouthRadius * smileEmotion;
      }
    });
  }, [emotion]);

  const calculateFieldFormation = useCallback((particles: Particle[], cx: number, cy: number) => {
    const width = 400;
    const height = 60;

    particles.forEach((p, i) => {
      const ratio = i / particles.length;

      if (ratio < 0.5) {
        // Top edge
        p.targetX = cx - width / 2 + ratio * width * 2;
        p.targetY = cy - height / 2;
      } else if (ratio < 0.75) {
        // Right edge
        p.targetX = cx + width / 2;
        p.targetY = cy - height / 2 + (ratio - 0.5) * height * 4;
      } else if (ratio < 1) {
        // Bottom edge
        p.targetX = cx + width / 2 - (ratio - 0.75) * width * 4;
        p.targetY = cy + height / 2;
      } else {
        // Left edge
        p.targetX = cx - width / 2;
        p.targetY = cy + height / 2 - (ratio - 1) * height;
      }
    });
  }, []);

  const calculateButtonFormation = useCallback((particles: Particle[], cx: number, cy: number) => {
    const width = 200;
    const height = 50;
    const cornerRadius = 15;

    particles.forEach((p, i) => {
      const ratio = i / particles.length;
      const edge = Math.floor(ratio * 4);
      const t = (ratio * 4) % 1;

      switch (edge) {
        case 0: // Top
          p.targetX = cx - width / 2 + cornerRadius + t * (width - 2 * cornerRadius);
          p.targetY = cy - height / 2;
          break;
        case 1: // Right
          p.targetX = cx + width / 2;
          p.targetY = cy - height / 2 + cornerRadius + t * (height - 2 * cornerRadius);
          break;
        case 2: // Bottom
          p.targetX = cx + width / 2 - cornerRadius - t * (width - 2 * cornerRadius);
          p.targetY = cy + height / 2;
          break;
        case 3: // Left
          p.targetX = cx - width / 2;
          p.targetY = cy + height / 2 - cornerRadius - t * (height - 2 * cornerRadius);
          break;
      }
    });
  }, []);

  const calculateScatteredFormation = useCallback((particles: Particle[]) => {
    particles.forEach((p) => {
      p.targetX = Math.random() * dimensions.width;
      p.targetY = Math.random() * dimensions.height;
    });
  }, [dimensions.width, dimensions.height]);

  const calculateLoadingFormation = useCallback((particles: Particle[], cx: number, cy: number) => {
    const radius = 80;
    particles.forEach((p, i) => {
      const angle = (i / particles.length) * Math.PI * 2 + timeRef.current * 0.02;
      p.targetX = cx + Math.cos(angle) * radius;
      p.targetY = cy + Math.sin(angle) * radius;
    });
  }, []);

  // Calculate target positions for formation
  const calculateFormation = useCallback((type: ParticleFormation) => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const particles = particlesRef.current;

    switch (type) {
      case 'face':
        calculateFaceFormation(particles, centerX, centerY);
        break;
      case 'field':
        calculateFieldFormation(particles, centerX, centerY);
        break;
      case 'button':
        calculateButtonFormation(particles, centerX, centerY);
        break;
      case 'scattered':
        calculateScatteredFormation(particles);
        break;
      case 'loading':
        calculateLoadingFormation(particles, centerX, centerY);
        break;
    }
  }, [dimensions.width, dimensions.height, calculateFaceFormation, calculateFieldFormation, calculateButtonFormation, calculateScatteredFormation, calculateLoadingFormation]);

  // Initialize particles
  useEffect(() => {
    const particleCount = 150;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        targetX: 0,
        targetY: 0,
        radius: Math.random() * 2 + 1,
        color: '#60A5FA', // primary-400
        alpha: Math.random() * 0.5 + 0.5,
      });
    }

    particlesRef.current = particles;
    calculateFormation(formation);
  }, [dimensions.width, dimensions.height, formation, calculateFormation]);

  // Update formation when it changes
  useEffect(() => {
    calculateFormation(formation);
  }, [formation, calculateFormation]);

  // Update particle colors based on emotion
  useEffect(() => {
    const particles = particlesRef.current;
    let color = '#60A5FA'; // primary-400

    switch (emotion) {
      case 'happy':
      case 'success':
        color = '#34D399'; // green-400
        break;
      case 'error':
        color = '#F87171'; // red-400
        break;
      case 'listening':
        color = '#A78BFA'; // purple-400
        break;
      default:
        color = '#60A5FA'; // primary-400
    }

    particles.forEach((p) => {
      p.color = color;
    });
  }, [emotion]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const animate = () => {
      timeRef.current++;
      const particles = particlesRef.current;

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Update and draw particles
      particles.forEach((p) => {
        // Move toward target with spring physics
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const spring = 0.05;
        const damping = 0.9;

        p.vx += dx * spring;
        p.vy += dy * spring;
        p.vx *= damping;
        p.vy *= damping;

        p.x += p.vx;
        p.y += p.vy;

        // Audio reactivity (breathing effect)
        const breathe = Math.sin(timeRef.current * 0.05) * 2;
        const audioReact = audioLevel * 5;
        const finalRadius = Math.max(0.5, p.radius + breathe + audioReact);

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, finalRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(p.alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();

        // Draw connections to nearby particles
        particles.forEach((other) => {
          if (other.id <= p.id) return;
          const dist = Math.hypot(p.x - other.x, p.y - other.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `${p.color}${Math.floor((1 - dist / 100) * 0.2 * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, audioLevel]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ background: 'transparent' }}
    />
  );
}
