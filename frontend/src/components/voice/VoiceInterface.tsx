import { useState } from 'react';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useVoiceActivityDetection } from '@/hooks/useVoiceActivityDetection';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceInterface() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const {
    messages,
    isConnected,
    isProcessing,
    isAIPlaying,
    connect,
    disconnect,
    interruptAI,
  } = useVoiceChat();

  // VAD detects when user starts speaking
  const { isSpeaking } = useVoiceActivityDetection({
    enabled: isCallActive && !isMuted,
    onSpeechStart: () => {
      console.log('User started speaking');
      // Interrupt AI if it's currently speaking
      if (isAIPlaying) {
        interruptAI();
      }
    },
    onSpeechEnd: () => {
      console.log('User stopped speaking');
    },
  });

  const toggleCall = () => {
    if (isCallActive) {
      disconnect();
      setIsCallActive(false);
    } else {
      connect();
      setIsCallActive(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200" />
                </div>
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-gray-950 border-t border-gray-800">
        <div className="flex items-center justify-center gap-6">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            disabled={!isCallActive}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-800 hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* Call button */}
          <button
            onClick={toggleCall}
            className={`p-6 rounded-full transition-all transform hover:scale-105 ${
              isCallActive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isCallActive ? <PhoneOff size={32} /> : <Phone size={32} />}
          </button>

          {/* Status indicator */}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-600'
              }`}
            />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* User speaking indicator */}
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600/20 rounded-full">
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
              <span className="text-sm text-primary-400">Listening...</span>
            </div>
          </motion.div>
        )}

        {/* AI speaking indicator */}
        {isAIPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 rounded-full">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" />
                <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse delay-75" />
                <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse delay-150" />
              </div>
              <span className="text-sm text-purple-400">ARIA speaking...</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
