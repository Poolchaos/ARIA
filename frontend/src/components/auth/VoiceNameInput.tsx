import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2, X } from 'lucide-react';
import { playVoice } from '@/services/audioService';

interface VoiceNameInputProps {
  name: string;
  isAssistantSpeaking: boolean;
  onPhoneticNameCaptured: (phoneticName: string) => void;
  onSkip: () => void;
}

export function VoiceNameInput({ name, isAssistantSpeaking, onPhoneticNameCaptured, onSkip }: VoiceNameInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [capturedName, setCapturedName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    console.log('[VoiceNameInput] Component mounted');
    return () => {
      console.log('[VoiceNameInput] Component unmounting, cleaning up recognition');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore errors during cleanup
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startRecording = () => {
    console.log('[VoiceNameInput] startRecording called');
    // @ts-expect-error - SpeechRecognition is not in standard types yet
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[VoiceNameInput] Speech recognition not supported');
      alert('Speech recognition is not supported in your browser');
      return;
    }

    // Abort any existing recognition first
    if (recognitionRef.current) {
      console.log('[VoiceNameInput] Aborting existing recognition');
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore errors
      }
      recognitionRef.current = null;
    }

    console.log('[VoiceNameInput] Creating new recognition instance');
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[VoiceNameInput] Recognition started');
      setIsRecording(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('[VoiceNameInput] Recognition result:', transcript);
      setCapturedName(transcript);
      setIsRecording(false);
      recognitionRef.current = null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.log('[VoiceNameInput] Recognition error:', event.error);
      // Only log non-abort errors
      if (event.error !== 'aborted') {
        console.error('[VoiceNameInput] Speech recognition error:', event.error);
      }
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      console.log('[VoiceNameInput] Recognition ended');
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      console.log('[VoiceNameInput] Starting recognition...');
      recognition.start();
    } catch (error) {
      console.error('[VoiceNameInput] Failed to start recognition:', error);
      setIsRecording(false);
      recognitionRef.current = null;
    }
  };

  const stopRecording = () => {
    console.log('[VoiceNameInput] stopRecording called');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors
      }
      recognitionRef.current = null;
      setIsRecording(false);
    }
  };

  const playbackName = async () => {
    console.log('[VoiceNameInput] playbackName called, capturedName:', capturedName);
    if (!capturedName) return;

    await playVoice({
      text: capturedName,
      onStateChange: setIsPlaying,
    });
  };

  const confirmName = () => {
    console.log('[VoiceNameInput] confirmName called, capturedName:', capturedName);
    // Stop any active recording before confirming
    if (recognitionRef.current) {
      console.log('[VoiceNameInput] Aborting recognition before confirm');
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore errors
      }
      recognitionRef.current = null;
    }

    if (capturedName) {
      onPhoneticNameCaptured(capturedName);
    }
  };

  const handleSkip = () => {
    console.log('[VoiceNameInput] handleSkip called');
    // Stop any active recording before skipping
    if (recognitionRef.current) {
      console.log('[VoiceNameInput] Aborting recognition before skip');
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore errors
      }
      recognitionRef.current = null;
    }
    onSkip();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md"
    >
      <div className="bg-dark-300/30 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            How do you pronounce "{name}"?
          </h3>
          <button
            onClick={handleSkip}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Skip"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Say your name so I can pronounce it correctly
        </p>

        <div className="space-y-4">
          {/* Recording button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isPlaying || isAssistantSpeaking}
            className={`
              w-full py-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2
              ${isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-primary-500 hover:bg-primary-600 text-white'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Mic className="w-5 h-5" />
            {isAssistantSpeaking ? 'Wait for assistant...' : isRecording ? 'Recording... (Click to stop)' : 'Record Your Name'}
          </button>

          {/* Captured name display */}
          {capturedName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800/50 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Captured:</span>
                <span className="text-white font-medium">{capturedName}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={playbackName}
                  disabled={isPlaying}
                  className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4" />
                  {isPlaying ? 'Playing...' : 'Test'}
                </button>
                <button
                  onClick={confirmName}
                  disabled={isPlaying}
                  className="flex-1 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>

              <button
                onClick={() => setCapturedName('')}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Record Again
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
