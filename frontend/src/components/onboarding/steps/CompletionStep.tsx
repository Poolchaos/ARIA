import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface CompletionStepProps {
  onFinish: () => void;
}

export function CompletionStep({ onFinish }: CompletionStepProps) {
  useEffect(() => {
    // Trigger confetti on mount
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0ea5e9', '#3b82f6', '#8b5cf6', '#ec4899'],
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="mb-8"
      >
        <div className="relative">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full blur-2xl opacity-30"
          ></motion.div>
          <CheckCircle2 className="w-24 h-24 text-primary-400 relative z-10" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl font-bold text-white mb-4"
      >
        You're All Set!
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-gray-300 mb-8 max-w-2xl"
      >
        ARIA is now personalized just for you. Let's start making your household management effortless!
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-4 mb-12"
      >
        <div className="flex items-center gap-3 text-gray-400">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <span>Voice commands ready</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <span>Personalized experience configured</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <span>AI assistant activated</span>
        </div>
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onFinish}
        className="px-12 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg transition-all text-lg"
      >
        Start Using ARIA
      </motion.button>
    </div>
  );
}
