import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { playVoice } from '@/services/audioService';

interface WelcomeStepProps {
  userName: string;
  userPhoneticName?: string;
  onNext: () => void;
  onVoiceStateChange: (isPlaying: boolean) => void;
}

// Personalized welcome message variations
const getWelcomeMessage = (name: string): string => {
  const messages = [
    `Hello ${name}! Welcome to ARIA, your intelligent household assistant. I'm here to help you manage your daily tasks, calendar, shopping, and more. Let's get you set up!`,
    `Hi ${name}, it's wonderful to meet you! I'm ARIA, and I'll be helping you keep your household running smoothly. Let's personalize your experience together!`,
    `Welcome, ${name}! I'm ARIA, your personal household assistant. I'm excited to help you organize your life and make everyday tasks effortless. Shall we begin?`,
    `${name}, welcome aboard! I'm ARIA, here to make managing your home a breeze. From calendars to shopping lists, I've got you covered. Let's get started!`,
  ];
  
  // Pick a random message
  return messages[Math.floor(Math.random() * messages.length)];
};

export function WelcomeStep({ userName, userPhoneticName, onNext, onVoiceStateChange }: WelcomeStepProps) {
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Use phonetic name for speech, but display name for text
    const spokenName = userPhoneticName || userName;
    console.log('[WelcomeStep] userName:', userName, 'userPhoneticName:', userPhoneticName, 'spokenName:', spokenName);
    
    const welcomeMessage = getWelcomeMessage(spokenName);

    playVoice({
      text: welcomeMessage,
      onStateChange: onVoiceStateChange,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, prevent re-runs from prop changes

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
