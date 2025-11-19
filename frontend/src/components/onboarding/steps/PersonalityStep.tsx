import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Heart, Zap, Shield } from 'lucide-react';

interface PersonalityTrait {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  provider: 'claude' | 'gemini' | 'openai';
}

const PERSONALITY_TRAITS: PersonalityTrait[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Concise, efficient, and focused on productivity',
    icon: <Brain className="w-8 h-8" />,
    provider: 'claude',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm, conversational, and personable',
    icon: <Heart className="w-8 h-8" />,
    provider: 'claude',
  },
  {
    id: 'energetic',
    name: 'Energetic',
    description: 'Enthusiastic, motivating, and upbeat',
    icon: <Zap className="w-8 h-8" />,
    provider: 'gemini',
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Patient, reassuring, and thoughtful',
    icon: <Shield className="w-8 h-8" />,
    provider: 'claude',
  },
];

interface PersonalityStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function PersonalityStep({ onNext, onBack }: PersonalityStepProps) {
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityTrait>(
    PERSONALITY_TRAITS[0]
  );

  const handleContinue = () => {
    localStorage.setItem('selectedPersonality', JSON.stringify(selectedPersonality));
    onNext();
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mb-8">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Choose Your AI Personality
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400"
        >
          How would you like me to interact with you?
        </motion.p>
      </div>

      {/* Personality grid */}
      <div className="grid grid-cols-2 gap-6 mb-8 flex-1">
        {PERSONALITY_TRAITS.map((trait) => (
          <motion.div
            key={trait.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => setSelectedPersonality(trait)}
            className={`relative p-6 rounded-2xl cursor-pointer transition-all ${
              selectedPersonality.id === trait.id
                ? 'bg-gradient-to-br from-primary-500/20 to-primary-600/20 border-2 border-primary-500 ring-4 ring-primary-500/20'
                : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-600'
            }`}
          >
            {/* Icon */}
            <div
              className={`inline-flex p-4 rounded-xl mb-4 ${
                selectedPersonality.id === trait.id
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-gray-700/50 text-gray-400'
              }`}
            >
              {trait.icon}
            </div>

            {/* Content */}
            <h3 className="text-xl font-semibold text-white mb-2">{trait.name}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{trait.description}</p>

            {/* Provider badge */}
            <div className="mt-4">
              <span className="inline-block px-2 py-1 text-xs bg-gray-700/50 text-gray-300 rounded">
                Powered by {trait.provider === 'claude' ? 'Claude' : trait.provider === 'gemini' ? 'Gemini' : 'OpenAI'}
              </span>
            </div>

            {/* Selection indicator */}
            {selectedPersonality.id === trait.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
              >
                <div className="w-2 h-2 bg-white rounded-full" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-700">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
