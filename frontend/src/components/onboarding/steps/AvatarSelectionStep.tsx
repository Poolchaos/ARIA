import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Avatar {
  id: string;
  name: string;
  type: 'particle' | 'wave' | 'orb' | 'abstract';
  primaryColor: string;
  secondaryColor: string;
  preview: string;
}

const AVAILABLE_AVATARS: Avatar[] = [
  { id: 'particle-blue', name: 'Particle Flow', type: 'particle', primaryColor: '#0ea5e9', secondaryColor: '#3b82f6', preview: 'Flowing particles in blue' },
  { id: 'particle-purple', name: 'Cosmic Particles', type: 'particle', primaryColor: '#a855f7', secondaryColor: '#ec4899', preview: 'Purple cosmic particles' },
  { id: 'wave-teal', name: 'Sound Wave', type: 'wave', primaryColor: '#14b8a6', secondaryColor: '#06b6d4', preview: 'Teal sound waves' },
  { id: 'wave-orange', name: 'Energy Wave', type: 'wave', primaryColor: '#f59e0b', secondaryColor: '#ef4444', preview: 'Warm energy waves' },
  { id: 'orb-cyan', name: 'Glowing Orb', type: 'orb', primaryColor: '#06b6d4', secondaryColor: '#0891b2', preview: 'Cyan glowing orb' },
  { id: 'orb-green', name: 'Emerald Orb', type: 'orb', primaryColor: '#10b981', secondaryColor: '#059669', preview: 'Green pulsing orb' },
  { id: 'abstract-multi', name: 'Abstract Art', type: 'abstract', primaryColor: '#8b5cf6', secondaryColor: '#ec4899', preview: 'Colorful abstract shapes' },
  { id: 'abstract-mono', name: 'Minimal Abstract', type: 'abstract', primaryColor: '#6366f1', secondaryColor: '#818cf8', preview: 'Minimal geometric shapes' },
];

interface AvatarSelectionStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function AvatarSelectionStep({ onNext, onBack }: AvatarSelectionStepProps) {
  const { user, updateUser } = useAuthStore();

  // Initialize from user preferences or localStorage
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(() => {
    // Try user's saved preference first
    if (user?.selectedAvatar) {
      const savedAvatar = AVAILABLE_AVATARS.find(a => a.id === user.selectedAvatar);
      if (savedAvatar) return savedAvatar;
    }

    // Try localStorage
    try {
      const saved = localStorage.getItem('selectedAvatar');
      if (saved) {
        const parsed = JSON.parse(saved);
        const avatar = AVAILABLE_AVATARS.find(a => a.id === parsed.id);
        if (avatar) return avatar;
      }
    } catch {
      // Ignore parse errors
    }

    // Default to first avatar
    return AVAILABLE_AVATARS[0];
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    try {
      setIsSaving(true);

      // Save to backend
      await userApi.updatePreferences({
        selectedAvatar: selectedAvatar.id,
        selectedAvatarColor: selectedAvatar.primaryColor,
      });

      // Update local auth store
      updateUser({
        selectedAvatar: selectedAvatar.id,
        selectedAvatarColor: selectedAvatar.primaryColor,
      });

      // Also save to localStorage for immediate access
      localStorage.setItem('selectedAvatar', JSON.stringify(selectedAvatar));

      onNext();
    } catch (error) {
      console.error('Failed to save avatar preferences:', error);
      // Still proceed to next step even if save fails
      localStorage.setItem('selectedAvatar', JSON.stringify(selectedAvatar));
      onNext();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mb-8">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Choose Your Avatar
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400"
        >
          Select a visual style that represents you
        </motion.p>
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 flex-1">
        {AVAILABLE_AVATARS.map((avatar) => (
          <motion.div
            key={avatar.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setSelectedAvatar(avatar)}
            className={`relative p-4 rounded-xl cursor-pointer transition-all ${
              selectedAvatar.id === avatar.id
                ? 'bg-gray-800 border-2 border-primary-500 ring-4 ring-primary-500/20'
                : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-600'
            }`}
          >
            {selectedAvatar.id === avatar.id && (
              <div className="absolute top-2 right-2 z-10">
                <div className="bg-primary-500 rounded-full p-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            {/* Avatar preview */}
            <div
              className="w-full aspect-square rounded-lg mb-3 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${avatar.primaryColor}, ${avatar.secondaryColor})`,
              }}
            >
              {/* Animated overlay based on type */}
              {avatar.type === 'particle' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="w-full h-full"
                    style={{
                      background: `radial-gradient(circle, ${avatar.primaryColor}40 0%, transparent 70%)`,
                    }}
                  />
                </div>
              )}
              {avatar.type === 'wave' && (
                <div className="absolute inset-0">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [-10, 10, -10],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: 'easeInOut',
                      }}
                      className="absolute top-1/2 left-0 right-0 h-1 rounded"
                      style={{
                        background: avatar.primaryColor,
                        opacity: 0.6 - i * 0.2,
                      }}
                    />
                  ))}
                </div>
              )}
              {avatar.type === 'orb' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="w-16 h-16 rounded-full"
                    style={{
                      background: avatar.primaryColor,
                      boxShadow: `0 0 30px ${avatar.primaryColor}80`,
                    }}
                  />
                </div>
              )}
              {avatar.type === 'abstract' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="w-12 h-12"
                    style={{
                      background: `conic-gradient(from 0deg, ${avatar.primaryColor}, ${avatar.secondaryColor}, ${avatar.primaryColor})`,
                      borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                    }}
                  />
                </div>
              )}
            </div>

            <h3 className="font-medium text-white text-sm text-center mb-1">
              {avatar.name}
            </h3>
            <p className="text-xs text-gray-400 text-center line-clamp-2">
              {avatar.preview}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-700">
        <button
          onClick={onBack}
          disabled={isSaving}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={isSaving}
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
