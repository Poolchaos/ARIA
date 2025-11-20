import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Palette, Sparkles, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, updateUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [profanityFilterEnabled, setProfanityFilterEnabled] = useState(
    user?.profanityFilterEnabled ?? true
  );

  useEffect(() => {
    setProfanityFilterEnabled(user?.profanityFilterEnabled ?? true);
  }, [user]);

  const handleToggleProfanityFilter = async () => {
    const newValue = !profanityFilterEnabled;
    setProfanityFilterEnabled(newValue);

    try {
      setIsSaving(true);
      await userApi.updatePreferences({ profanityFilterEnabled: newValue });
      updateUser({ profanityFilterEnabled: newValue });
    } catch (error) {
      console.error('Failed to update profanity filter setting:', error);
      // Revert on error
      setProfanityFilterEnabled(!newValue);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20">
              {/* Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-purple-500/20 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Settings</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Voice Settings Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Volume2 className="text-purple-400" size={20} />
                    <h3 className="text-lg font-semibold text-white">Voice Settings</h3>
                  </div>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Voice</p>
                        <p className="text-gray-400 text-sm">
                          {user?.voiceName || 'Default'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Volume</p>
                        <p className="text-gray-400 text-sm">
                          {Math.round((user?.voiceVolume ?? 1) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appearance Settings Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Palette className="text-purple-400" size={20} />
                    <h3 className="text-lg font-semibold text-white">Appearance</h3>
                  </div>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Avatar</p>
                        <p className="text-gray-400 text-sm capitalize">
                          {user?.selectedAvatar || 'Wave'}
                        </p>
                      </div>
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: user?.selectedAvatarColor || '#a855f7' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Personality Settings Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-purple-400" size={20} />
                    <h3 className="text-lg font-semibold text-white">Personality</h3>
                  </div>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Style</p>
                        <p className="text-gray-400 text-sm capitalize">
                          {user?.selectedPersonality || 'Friendly'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Filter Settings Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="text-purple-400" size={20} />
                    <h3 className="text-lg font-semibold text-white">Content Filtering</h3>
                  </div>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Profanity Filter</p>
                        <p className="text-gray-400 text-sm">
                          ARIA will respond when bad language is detected
                        </p>
                      </div>
                      <button
                        onClick={handleToggleProfanityFilter}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          profanityFilterEnabled ? 'bg-purple-600' : 'bg-gray-600'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            profanityFilterEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">Tip:</strong> To change your voice or avatar,
                    go through the onboarding flow again from your profile.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
