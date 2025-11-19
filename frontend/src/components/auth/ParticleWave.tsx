import { useMemo } from 'react';
import Particles from '@tsparticles/react';
import type { ISourceOptions } from '@tsparticles/engine';

interface ParticleWaveProps {
  isSpeaking?: boolean;
  emotion?: 'idle' | 'happy' | 'listening' | 'error' | 'success';
  className?: string;
}

/**
 * Beautiful flowing particle wave visualization
 * Inspired by audio waveform particle effects
 */
export function ParticleWave({ isSpeaking = false, emotion = 'idle', className = '' }: ParticleWaveProps) {

  // Color based on emotion
  const getColors = () => {
    switch (emotion) {
      case 'happy':
      case 'success':
        return ['#34D399', '#10B981', '#059669']; // Green
      case 'error':
        return ['#EF4444', '#DC2626', '#B91C1C']; // Red
      case 'listening':
        return ['#60A5FA', '#3B82F6', '#2563EB']; // Blue
      default:
        return ['#60A5FA', '#8B5CF6', '#EC4899']; // Blue to Purple to Pink gradient
    }
  };

  const colors = getColors();

  // Particle configuration for flowing wave effect
  const options: ISourceOptions = useMemo(() => ({
    background: {
      color: {
        value: 'transparent',
      },
    },
    fpsLimit: 120,
    particles: {
      number: {
        value: isSpeaking ? 150 : 100,
        density: {
          enable: true,
          width: 800,
          height: 600,
        },
      },
      color: {
        value: colors,
        animation: {
          enable: true,
          speed: 20,
          sync: false,
        },
      },
      shape: {
        type: 'circle',
      },
      opacity: {
        value: { min: 0.3, max: 0.8 },
        animation: {
          enable: true,
          speed: isSpeaking ? 3 : 1,
          sync: false,
        },
      },
      size: {
        value: { min: 1, max: 3 },
        animation: {
          enable: true,
          speed: isSpeaking ? 5 : 2,
          sync: false,
        },
      },
      links: {
        enable: true,
        distance: 150,
        color: colors[0],
        opacity: 0.4,
        width: 1,
        triangles: {
          enable: true,
          opacity: 0.1,
        },
      },
      move: {
        enable: true,
        speed: isSpeaking ? 2 : 0.5,
        direction: 'none',
        random: true,
        straight: false,
        outModes: {
          default: 'out',
        },
        attract: {
          enable: true,
          rotateX: 600,
          rotateY: 1200,
        },
        trail: {
          enable: true,
          length: 10,
          fill: {
            color: {
              value: '#000000',
            },
          },
        },
        vibrate: true,
        warp: true,
      },
      wobble: {
        enable: true,
        distance: 20,
        speed: isSpeaking ? 20 : 10,
      },
      orbit: {
        enable: true,
        opacity: 1,
        width: 2,
      },
    },
    interactivity: {
      detectsOn: 'canvas',
      events: {
        onHover: {
          enable: false,
        },
        onClick: {
          enable: false,
        },
        resize: {
          enable: true,
          delay: 0.5,
        },
      },
    },
    detectRetina: true,
    smooth: true,
    emitters: {
      position: {
        x: 50,
        y: 50,
      },
      rate: {
        quantity: 5,
        delay: 0.1,
      },
    },
  }), [isSpeaking, colors]);

  return (
    <div className={`w-full h-full ${className}`}>
      <Particles
        id="particle-wave"
        options={options}
        className="w-full h-full"
      />
    </div>
  );
}
