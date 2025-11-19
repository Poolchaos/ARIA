import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  userName: string;
  onNext: () => void;
  onVoiceStateChange: (isPlaying: boolean) => void;
}

export function WelcomeStep({ userName, onNext, onVoiceStateChange }: WelcomeStepProps) {
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);

  useEffect(() => {
    if (hasPlayedWelcome) return;

    // Play welcome message
    const welcomeMessage = `Hello ${userName}! Welcome to ARIA, your intelligent household assistant. I'm here to help you manage your daily tasks, calendar, shopping, and more. Let's get you set up!`;

    playWelcomeVoice(welcomeMessage, onVoiceStateChange).then(() => {
      setHasPlayedWelcome(true);
    });
  }, [userName, hasPlayedWelcome, onVoiceStateChange]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="mb-8"
      >
        <div className="relative">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full blur-2xl opacity-30"
          />
          <Sparkles className="w-24 h-24 text-primary-400 relative z-10" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl font-bold text-white mb-4"
      >
        Welcome, {userName}!
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-gray-300 mb-8 max-w-2xl"
      >
        I'm ARIA, your intelligent household assistant. I'm here to help you manage
        your daily tasks, calendar, shopping, and budgets with the power of voice.
      </motion.p>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-gray-400 mb-12"
      >
        Let's personalize your experience in just a few steps
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg transition-all"
      >
        Let's Get Started
      </motion.button>
    </div>
  );
}

async function playWelcomeVoice(text: string, onStateChange: (isPlaying: boolean) => void) {
  try {
    onStateChange(true);

    // Call TTS API
    const response = await fetch('http://localhost:8002/voice/test-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice_name: 'en-US-GuyNeural', // Male voice for welcome
      }),
    });

    if (!response.ok) {
      throw new Error('TTS request failed');
    }

    const data = await response.json();
    const audioData = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      onStateChange(false);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      onStateChange(false);
    };

    await audio.play();
  } catch (error) {
    console.error('Failed to play welcome voice:', error);
    onStateChange(false);
  }
}
