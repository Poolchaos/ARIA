import { motion, AnimatePresence } from 'framer-motion';

interface VoicePermissionModalProps {
  onRequestPermission: () => void;
  onDismiss: () => void;
}

export function VoicePermissionModal({ onRequestPermission, onDismiss }: VoicePermissionModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
          className="bg-dark-300 rounded-2xl p-8 max-w-md mx-4 border-2 border-primary-500/30 shadow-xl"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold text-gray-100 text-center mb-4">
            Enable Voice Guidance
          </h2>
          <p className="text-gray-400 text-center mb-6">
            ARIA uses voice synthesis to guide you through authentication. 
            Click "Enable Voice" to hear AI prompts for each step.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-3 rounded-lg bg-dark-400 hover:bg-dark-500 text-gray-300 transition-colors"
            >
              Skip Voice
            </button>
            <button
              onClick={onRequestPermission}
              className="flex-1 px-4 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
            >
              Enable Voice
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-500 text-center mt-4">
            You can still use ARIA without voice guidance
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
