import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParticleInputProps {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onEscape?: () => void;
  disabled?: boolean;
  error?: string;
  voiceInput?: boolean;
}

export function ParticleInput({
  label,
  type,
  value,
  onChange,
  placeholder = '',
  autoFocus = false,
  onEnter,
  onEscape,
  disabled = false,
  error,
  voiceInput = false,
}: ParticleInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [keystrokes, setKeystrokes] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const keystrokeCounter = useRef(0);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    } else if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
    }

    // Create particle effect on keystroke
    if (e.key.length === 1 || e.key === 'Backspace') {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        const id = keystrokeCounter.current++;
        const x = Math.random() * rect.width;
        const y = rect.height / 2;

        setKeystrokes((prev) => [...prev, { id, x, y }]);

        // Remove particle after animation
        setTimeout(() => {
          setKeystrokes((prev) => prev.filter((k) => k.id !== id));
        }, 800);
      }
    }
  };

  return (
    <motion.div
      className="relative w-full max-w-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Floating label */}
      <motion.label
        className={`absolute left-4 transition-all duration-300 pointer-events-none ${
          isFocused || value
            ? '-top-2.5 text-xs text-primary-400 bg-dark-200 px-2'
            : 'top-4 text-sm text-gray-400'
        }`}
        htmlFor={label}
      >
        {label}
      </motion.label>

      {/* Input container with glassmorphic effect */}
      <div className="relative">
        <input
          ref={inputRef}
          id={label}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={isFocused ? placeholder : ''}
          disabled={disabled}
          className={`
            w-full px-4 py-4 rounded-xl
            bg-dark-300/30 backdrop-blur-sm
            border-2 transition-all duration-300
            text-gray-100 placeholder-gray-500
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? 'border-red-500 focus:border-red-400'
                : isFocused
                  ? 'border-primary-400 shadow-lg shadow-primary-500/20'
                  : 'border-gray-700 hover:border-gray-600'
            }
          `}
        />

        {/* Voice input indicator */}
        <AnimatePresence>
          {voiceInput && (
            <motion.div
              className="absolute right-3 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="relative w-6 h-6">
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary-500/20"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary-400"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keystroke particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          <AnimatePresence>
            {keystrokes.map((keystroke) => (
              <motion.div
                key={keystroke.id}
                className="absolute w-1 h-1 rounded-full bg-primary-400"
                initial={{
                  x: keystroke.x,
                  y: keystroke.y,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  y: keystroke.y - 30,
                  opacity: 0,
                  scale: 0.5,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-2 text-sm text-red-400"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
