import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceVisualizer } from './VoiceVisualizer';
import { WelcomeStep } from './steps/WelcomeStep';
import { VoiceSelectionStep } from './steps/VoiceSelectionStep';
import { AvatarSelectionStep } from './steps/AvatarSelectionStep';
import { PersonalityStep } from './steps/PersonalityStep';
import { CompletionStep } from './steps/CompletionStep';
import { useAuthStore } from '@/store/authStore';

const ONBOARDING_STEPS = [
  'welcome',
  'voice',
  'avatar',
  'personality',
  'complete',
] as const;

type OnboardingStep = typeof ONBOARDING_STEPS[number];

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [direction, setDirection] = useState(1);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const { user } = useAuthStore();

  const currentStepIndex = ONBOARDING_STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < ONBOARDING_STEPS.length) {
      setDirection(1);
      setCurrentStep(ONBOARDING_STEPS[nextIndex]);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setDirection(-1);
      setCurrentStep(ONBOARDING_STEPS[prevIndex]);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  // Simulate audio level for visualization
  useEffect(() => {
    if (!isVoicePlaying) {
      const timer = setTimeout(() => setAudioLevel(0), 0);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 0.5 + 0.5);
    }, 100);

    return () => clearInterval(interval);
  }, [isVoicePlaying]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Background particle visualization */}
      <div className="absolute inset-0 opacity-30">
        <VoiceVisualizer isActive={isVoicePlaying} audioLevel={audioLevel} />
      </div>

      {/* Modal container */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Step indicator */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {currentStepIndex + 1} / {ONBOARDING_STEPS.length}
          </span>
        </div>

        {/* Content */}
        <div className="relative p-8 min-h-[600px] flex flex-col">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="flex-1 flex flex-col"
            >
              {currentStep === 'welcome' && (
                <WelcomeStep
                  userName={user?.name || 'there'}
                  onNext={nextStep}
                  onVoiceStateChange={setIsVoicePlaying}
                />
              )}
              {currentStep === 'voice' && (
                <VoiceSelectionStep
                  onNext={nextStep}
                  onBack={prevStep}
                  onVoicePreview={setIsVoicePlaying}
                />
              )}
              {currentStep === 'avatar' && (
                <AvatarSelectionStep
                  onNext={nextStep}
                  onBack={prevStep}
                />
              )}
              {currentStep === 'personality' && (
                <PersonalityStep
                  onNext={nextStep}
                  onBack={prevStep}
                />
              )}
              {currentStep === 'complete' && (
                <CompletionStep
                  onFinish={onComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
