import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useState, useEffect, useRef } from 'react';
import { ParticleWave } from '@/components/auth/ParticleWave';
import { LogOut, Calendar, ShoppingCart, Wallet, Package, Mic, Info, X, Edit2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playVoice } from '@/services/audioService';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { getIntentService } from '@/services/intentService';
import { getActionRouter } from '@/services/actionHandlers';
import {
  containsProfanity,
  updateProfanityState,
  getProfanityResponse,
  getApologyResponse,
  resetProfanityState,
} from '@/utils/profanityFilter';

const WAKE_WORD_RESPONSES = [
  "How can I help you?",
  "I'm listening.",
  "What can I do for you?",
  "Go ahead.",
  "I'm here.",
  "Ready when you are.",
  "What's on your mind?",
];

// Personalized greeting variations for returning users
const getPersonalizedGreeting = (name: string): string => {
  const timeOfDay = new Date().getHours();
  const greetings = [
    `Hi ${name}, nice to see you again! How can I help?`,
    `Welcome back, ${name}! What can I assist you with today?`,
    `${name}! Great to have you here. What would you like to do?`,
    `Hey ${name}, I'm ready to help. What's on your agenda?`,
  ];

  // Add time-based greetings
  if (timeOfDay < 12) {
    greetings.push(`Good morning, ${name}! Ready to tackle the day?`);
  } else if (timeOfDay < 18) {
    greetings.push(`Good afternoon, ${name}! How can I assist you?`);
  } else {
    greetings.push(`Good evening, ${name}! What can I help you with?`);
  }

  return greetings[Math.floor(Math.random() * greetings.length)];
};

export function HomePage() {
  const navigate = useNavigate();
  const { user, refreshToken, logout, updateUser } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVoiceCommands, setShowVoiceCommands] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [showPhoneticModal, setShowPhoneticModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [phoneticNameInput, setPhoneticNameInput] = useState('');
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [isListeningForCommand, setIsListeningForCommand] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [pendingCommand, setPendingCommand] = useState<{ transcript: string; intent: any } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const userRef = useRef(user);
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunning = useRef(false);
  const isSpeakingRef = useRef(false); // Track if ARIA is currently speaking
  const isProcessingRef = useRef(false); // Track if we're processing a command
  const pendingCommandRef = useRef<{ transcript: string; intent: any } | null>(null); // Track pending command
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Track confirmation timeout

  // Get services
  const intentService = getIntentService();
  const actionRouter = getActionRouter();

  useEffect(() => {
    userRef.current = user;
    // Show onboarding if user hasn't completed it
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true);
    }
    if (user?.phoneticName) {
      setPhoneticNameInput(user.phoneticName);
    }
  }, [user]);

  const speak = async (text: string) => {
    console.log('[speak] Starting to speak, stopping recognition');

    // CRITICAL: Stop recognition BEFORE speaking
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        isRecognitionRunning.current = false;
        console.log('[speak] Recognition stopped successfully');
      } catch (e) {
        console.error('[speak] Error stopping recognition:', e);
      }
    }

    // Set speaking flag IMMEDIATELY
    isSpeakingRef.current = true;

    // Wait a moment for recognition to fully stop
    await new Promise(resolve => setTimeout(resolve, 100));

    await playVoice({
      text,
      onStateChange: (speaking) => {
        console.log('[speak] onStateChange - speaking:', speaking);
        setIsSpeaking(speaking);
        isSpeakingRef.current = speaking;

        // Restart recognition ONLY when completely finished speaking
        if (!speaking) {
          console.log('[speak] Finished speaking, will restart recognition in 1 second');
          setTimeout(() => {
            if (!isRecognitionRunning.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                isRecognitionRunning.current = true;
                console.log('[speak] Recognition restarted after speaking');
              } catch (e) {
                if (!(e instanceof Error) || !e.message?.includes('already started')) {
                  console.error('[speak] Error restarting recognition after speech:', e);
                }
              }
            }
          }, 1000); // Longer delay to ensure audio is completely done
        }
      },
      onAnalyserReady: setAudioAnalyser,
    });
  };

  // Timeout for pending command confirmation (15 seconds)
  useEffect(() => {
    if (!pendingCommand) return;

    const timeoutId = setTimeout(() => {
      console.log('[Timeout] No confirmation received in 15 seconds, cancelling command');
      speak('No response received. Cancelling command.');
      setPendingCommand(null);
      pendingCommandRef.current = null;
      setIsProcessing(false);
      isListeningRef.current = false;
      setIsListeningForCommand(false);
      setCurrentIntent(null);

      // Restart recognition
      setTimeout(() => {
        if (recognitionRef.current && !isRecognitionRunning.current) {
          try {
            recognitionRef.current.start();
            isRecognitionRunning.current = true;
          } catch (e) {
            console.error('Error restarting recognition:', e);
          }
        }
      }, 1000);
    }, 15000); // 15 second timeout

    // Store timeout ID so it can be cancelled when command executes
    timeoutIdRef.current = timeoutId;

    return () => {
      console.log('[Timeout] Clearing timeout');
      clearTimeout(timeoutId);
      timeoutIdRef.current = null;
    };
  }, [pendingCommand]);

  // Handle voice commands with intent analysis
  const handleVoiceCommand = async (transcript: string) => {
    try {
      console.log('[HomePage] Processing voice command:', transcript);
      setCurrentIntent('Analyzing...');
      setIsProcessing(true);
      isProcessingRef.current = true;

      // Pause voice recognition while processing
      if (recognitionRef.current && isRecognitionRunning.current) {
        recognitionRef.current.stop();
        isRecognitionRunning.current = false;
      }

      // Analyze intent
      const intent = await intentService.analyzeIntent(transcript, {
        user: userRef.current,
        currentPage: 'home',
      });

      console.log('[HomePage] Intent analysis:', intent);
      setCurrentIntent(intent.intentType);

      // Store pending command for confirmation
      setPendingCommand({ transcript, intent });
      pendingCommandRef.current = { transcript, intent };

      // Ask for confirmation
      const confirmationMessage = `I heard you say: "${transcript}". Is that correct?`;
      await speak(confirmationMessage);

      // Set flag to wait for confirmation
      isListeningRef.current = true;
      setIsListeningForCommand(true);
      setCurrentIntent('Awaiting confirmation...');

      // Resume recognition after speaking
      setTimeout(() => {
        // Double check it's not already running
        if (recognitionRef.current && !isRecognitionRunning.current) {
          try {
            recognitionRef.current.start();
            isRecognitionRunning.current = true;
          } catch (e) {
            // Only log if it's not already started
            if (!(e instanceof Error) || !e.message?.includes('already started')) {
              console.error('Error restarting recognition:', e);
            }
          }
        }
      }, 1000);

    } catch (error) {
      console.error('[HomePage] Voice command error:', error);
      await speak('Sorry, I had trouble processing that. Could you try again?');
      setCurrentIntent(null);
      setIsProcessing(false);
      isProcessingRef.current = false;
      setPendingCommand(null);
      pendingCommandRef.current = null;

      // Restart recognition
      setTimeout(() => {
        if (recognitionRef.current && !isRecognitionRunning.current) {
          try {
            recognitionRef.current.start();
            isRecognitionRunning.current = true;
          } catch (e) {
            if (!(e instanceof Error) || !e.message?.includes('already started')) {
              console.error('Error restarting recognition:', e);
            }
          }
        }
      }, 1000);
    }
  };

  // Execute confirmed command
  const executeCommand = async (intent: any, transcript?: string) => {
    console.log('[executeCommand] ========== STARTING EXECUTION ==========');
    console.log('[executeCommand] Intent received:', intent);
    console.log('[executeCommand] Transcript received:', transcript);

    try {
      // CRITICAL: Clear the confirmation timeout to prevent it from firing mid-execution
      if (timeoutIdRef.current) {
        console.log('[executeCommand] Clearing confirmation timeout');
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      } else {
        console.log('[executeCommand] No timeout to clear');
      }

      console.log('[executeCommand] Setting current intent to Executing...');
      setCurrentIntent('Executing...');

      console.log('[executeCommand] About to call actionRouter.route');
      console.log('[executeCommand] ActionRouter:', actionRouter);
      console.log('[executeCommand] User:', userRef.current);

      // Route to appropriate action handler
      const result = await actionRouter.route(intent, {
        user: userRef.current,
        navigate,
        setShowSettings,
      });

      console.log('[executeCommand] ========== ACTION ROUTER COMPLETED ==========');
      console.log('[executeCommand] Action result:', result);

      // Speak the response
      if (result.message) {
        console.log('[executeCommand] About to speak result message:', result.message);
        await speak(result.message);
        console.log('[executeCommand] Finished speaking result message');
      } else {
        console.log('[executeCommand] No message to speak');
      }

      // Handle navigation
      if (result.navigationTarget) {
        console.log('[executeCommand] Scheduling navigation to:', result.navigationTarget);
        setTimeout(() => {
          navigate(result.navigationTarget!);
        }, 2000);
      }

      // Handle modals
      if (result.modalType === 'settings') {
        console.log('[executeCommand] Scheduling settings modal open');
        setTimeout(() => {
          setShowSettings(true);
        }, 1000);
      }

      // Update last command display temporarily
      if (transcript) {
        console.log('[executeCommand] Setting last command:', transcript);
        setLastCommand(transcript);
        // Clear the last command after 5 seconds
        setTimeout(() => {
          console.log('[executeCommand] Clearing last command display');
          setLastCommand(null);
        }, 5000);
      }
      setTimeout(() => setCurrentIntent(null), 3000);

    } catch (error) {
      console.error('[executeCommand] ========== ERROR OCCURRED ==========');
      console.error('[executeCommand] Command execution error:', error);
      console.error('[executeCommand] Error stack:', error instanceof Error ? error.stack : 'N/A');
      await speak('Sorry, something went wrong while executing that command.');
    } finally {
      console.log('[executeCommand] ========== FINALLY BLOCK - CLEANUP ==========');
      console.log('[executeCommand] Clearing processing state');
      setIsProcessing(false);
      isProcessingRef.current = false;
      setPendingCommand(null);
      pendingCommandRef.current = null;

      // CRITICAL: Reset to wake word listening mode
      isListeningRef.current = false;
      setIsListeningForCommand(false);
      console.log('[executeCommand] Reset to wake word mode - waiting for "Hi Aria"');

      // Restart recognition after execution
      setTimeout(() => {
        if (recognitionRef.current && !isRecognitionRunning.current) {
          try {
            recognitionRef.current.start();
            isRecognitionRunning.current = true;
            console.log('[executeCommand] Recognition restarted - ready for wake word');
          } catch (e) {
            console.error('Error restarting recognition:', e);
          }
        }
      }, 1000);
    }
  };

  // Handle confirmation response
  const handleConfirmation = async (transcript: string) => {
    const lower = transcript.toLowerCase().trim();

    // Helper to check if response is a simple yes/no (not part of ARIA's echo)
    // Avoid matching ARIA's own question like "is that correct"
    const words = lower.split(/\s+/);

    // If transcript contains question words, it's likely ARIA's echo, not user response
    if (lower.includes('is that') || lower.includes('are you') || lower.includes('do you')) {
      console.log('[handleConfirmation] Ignoring - looks like echo of ARIA speech:', transcript);
      return;
    }

    // Check for NO first (prioritize negative over positive)
    const noWords = ['no', 'nope', 'nah'];
    const hasNo = noWords.some(word => words.includes(word));

    if (hasNo || lower.includes('wrong') || lower.includes('again') ||
        lower.includes('repeat') || lower.includes('retry')) {
      console.log('[handleConfirmation] NO/RETRY detected - user wants to retry');

      // Clear timeout when user wants to retry
      if (timeoutIdRef.current) {
        console.log('[handleConfirmation] User wants retry - clearing timeout');
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }

      await speak('Okay, please say your command again.');
      setPendingCommand(null);
      pendingCommandRef.current = null;
      setIsProcessing(false);
      isProcessingRef.current = false; // CRITICAL: Clear the ref too!
      isListeningRef.current = true;
      setIsListeningForCommand(true);
      console.log('[handleConfirmation] Retry - cleared processing state, waiting for new command');
      // speak() will auto-restart recognition when done
    } else if (lower.includes('stop') || lower.includes('cancel') || lower.includes('nevermind')) {
      console.log('[handleConfirmation] CANCEL detected - user wants to cancel');

      // Clear timeout when user cancels
      if (timeoutIdRef.current) {
        console.log('[handleConfirmation] User cancelled - clearing timeout');
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }

      await speak('Okay, cancelled.');
      setPendingCommand(null);
      pendingCommandRef.current = null;
      setIsProcessing(false);
      isListeningRef.current = false;
      setIsListeningForCommand(false);
      setCurrentIntent(null);
      // speak() will auto-restart recognition when done
    } else {
      // Check for YES - simple word matching from split words
      const yesWords = ['yes', 'yep', 'yeah', 'correct', 'right', 'confirm', 'yup'];
      const hasYes = yesWords.some(word => words.includes(word));

      if (hasYes) {
        console.log('[handleConfirmation] YES detected - starting confirmation flow');

        // CRITICAL: Clear timeout immediately when user confirms
        if (timeoutIdRef.current) {
          console.log('[handleConfirmation] User confirmed - clearing timeout');
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        } else {
          console.log('[handleConfirmation] No timeout to clear');
        }

        // Store the command from REF (not state - avoid closure issues)
        const commandToExecute = pendingCommandRef.current;
        console.log('[handleConfirmation] Stored command from REF:', commandToExecute);

        // Close modal immediately
        setPendingCommand(null);
        pendingCommandRef.current = null;
        console.log('[handleConfirmation] Cleared pendingCommand state - modal should close now');

        console.log('[handleConfirmation] About to speak confirmation message');
        await speak('Okay, processing your request.');
        console.log('[handleConfirmation] Finished speaking confirmation message');

        if (commandToExecute) {
          console.log('[handleConfirmation] Calling executeCommand with intent:', commandToExecute.intent);
          await executeCommand(commandToExecute.intent, commandToExecute.transcript);
          console.log('[handleConfirmation] executeCommand completed');
        } else {
          console.error('[handleConfirmation] ERROR: No command to execute!');
        }
      } else {
        // Didn't understand confirmation, ask again
        await speak('I didn\'t catch that. Please say yes to confirm, or no to try again.');
        // speak() will auto-restart recognition when done
      }
    }
  };

  // Initialize speech recognition once on mount
  useEffect(() => {
    // @ts-expect-error - SpeechRecognition is not in standard types yet
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Recognition] Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Store reference for start/stop control
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim().toLowerCase();

      console.log('[Recognition] Voice input:', transcript, 'isSpeaking:', isSpeakingRef.current, 'isProcessing:', isProcessingRef.current, 'pendingCommand:', !!pendingCommandRef.current);

      // Ignore empty or whitespace-only transcripts
      if (!transcript || transcript.length === 0) {
        console.log('[Recognition] Ignoring empty transcript');
        return;
      }

      // CRITICAL: Ignore input while ARIA is speaking
      if (isSpeakingRef.current) {
        console.log('[Recognition] BLOCKED - ARIA is speaking, ignoring:', transcript);
        return;
      }

      // CRITICAL: Don't process new commands while already processing one
      // BUT allow confirmation responses when we have a pending command
      if (isProcessingRef.current && !pendingCommandRef.current) {
        console.log('[Recognition] BLOCKED - Already processing a command, ignoring:', transcript);
        return;
      }

      const currentUser = userRef.current;

      // Check for profanity if filter is enabled
      if (currentUser?.profanityFilterEnabled !== false) {
        if (containsProfanity(transcript)) {
          // Check for apology
          if (transcript.includes('sorry') || transcript.includes('apologize') || transcript.includes('my bad')) {
            resetProfanityState();
            speak(getApologyResponse());
            return;
          }

          // Update emotional state
          const state = updateProfanityState();
          const response = getProfanityResponse(state);
          speak(response);
          return;
        }
      }

      // If we have a pending command, handle confirmation
      if (pendingCommandRef.current) {
        handleConfirmation(transcript);
        return;
      }

      // Wake word detection
      if (transcript.includes('aria') || transcript.includes('hey aria')) {
        setIsListeningForCommand(true);
        isListeningRef.current = true;
        setCurrentIntent('Listening...');

        const nameToUse = currentUser?.phoneticName || currentUser?.name?.split(' ')[0];

        let response: string;
        if (nameToUse) {
          // Use personalized greeting most of the time (70% chance)
          if (Math.random() < 0.7) {
            response = getPersonalizedGreeting(nameToUse);
          } else {
            // Occasionally use simple responses (30% chance)
            const simpleResponses = [
              ...WAKE_WORD_RESPONSES,
              `Yes, ${nameToUse}?`,
              `I'm here, ${nameToUse}.`,
              `Hello, ${nameToUse}.`,
            ];
            response = simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
          }
        } else {
          // No name available, use generic responses
          response = WAKE_WORD_RESPONSES[Math.floor(Math.random() * WAKE_WORD_RESPONSES.length)];
        }

        speak(response);
        return; // Wait for next command
      }

      // If we're listening for a command after wake word, process it with intent service
      if (isListeningRef.current) {
        console.log('[HomePage] Processing command after wake word:', transcript);
        setIsListeningForCommand(false);
        isListeningRef.current = false;
        handleVoiceCommand(transcript);
        return;
      }

      // Legacy simple commands (fallback)
      if (transcript.includes('logout') || transcript.includes('log out') || transcript.includes('sign out')) {
        setLastCommand('Logout');
        handleLogout();
      } else if (transcript.includes('calendar') || transcript.includes('schedule')) {
        setLastCommand('Check Calendar');
        // TODO: Navigate to calendar
      } else if (transcript.includes('help') || transcript.includes('commands')) {
        setLastCommand('Show Commands');
        setShowVoiceCommands(true);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Recognition] Error:', event.error);
      isRecognitionRunning.current = false;

      // Don't restart on 'aborted' - only restart on legitimate errors
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (!isRecognitionRunning.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              isRecognitionRunning.current = true;
            } catch (e) {
              console.error('Error restarting recognition:', e);
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      console.log('[Recognition] onend fired, isRecognitionRunning:', isRecognitionRunning.current, 'isSpeaking:', isSpeakingRef.current);
      isRecognitionRunning.current = false;

      // CRITICAL: Do NOT auto-restart if ARIA is speaking or processing
      if (isSpeakingRef.current || isProcessingRef.current) {
        console.log('[Recognition] onend - NOT restarting (speaking or processing)');
        return;
      }

      // Auto-restart unless intentionally stopped
      setTimeout(() => {
        // Triple check before restarting
        if (!isRecognitionRunning.current && !isSpeakingRef.current && !isProcessingRef.current && recognitionRef.current) {
          try {
            console.log('[Recognition] Auto-restarting after end');
            recognitionRef.current.start();
            isRecognitionRunning.current = true;
          } catch (e) {
            // Only log if it's not already started
            if (!(e instanceof Error) || !e.message?.includes('already started')) {
              console.error('Error restarting recognition after end:', e);
            }
          }
        }
      }, 500);
    };    // Start recognition on mount
    console.log('[Recognition] Starting speech recognition');
    try {
      recognition.start();
      isRecognitionRunning.current = true;
    } catch (e) {
      console.error('Error starting speech recognition:', e);
    }

    return () => {
      console.log('[Recognition] Cleanup - stopping recognition');
      try {
        recognition.stop();
        isRecognitionRunning.current = false;
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    };
  }, []); // Run once on mount

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleSavePhoneticName = () => {
    updateUser({ phoneticName: phoneticNameInput });
    setShowPhoneticModal(false);
    speak(`Okay, I'll call you ${phoneticNameInput}.`);
  };

  const handleOnboardingComplete = () => {
    const voiceName = localStorage.getItem('selectedVoice');
    const selectedAvatar = localStorage.getItem('selectedAvatar');
    const selectedAvatarColor = localStorage.getItem('selectedAvatarColor');
    const selectedPersonality = localStorage.getItem('selectedPersonality');

    updateUser({
      onboardingCompleted: true,
      voiceName: voiceName || undefined,
      selectedAvatar: selectedAvatar || undefined,
      selectedAvatarColor: selectedAvatarColor || undefined,
      selectedPersonality: selectedPersonality || undefined,
    });

    setShowOnboarding(false);
  };

  const menuItems = [
    { icon: Calendar, label: 'Calendar', desc: "What's on my schedule?", active: true, color: 'blue' },
    { icon: Wallet, label: 'Budget', desc: 'Track spending', active: false, color: 'green' },
    { icon: ShoppingCart, label: 'Grocery', desc: 'Meal planning', active: false, color: 'purple' },
    { icon: Package, label: 'Inventory', desc: 'Household items', active: false, color: 'orange' },
  ];

  const voiceCommands = [
    { command: '"Hey Aria"', desc: 'Wake word to get attention' },
    { command: '"Check my calendar"', desc: 'View your upcoming schedule' },
    { command: '"Logout" / "Sign out"', desc: 'Securely log out of the system' },
    { command: '"Show commands"', desc: 'Open this help menu' },
  ];

  return (
    <>
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Voice Commands Modal */}
      <AnimatePresence>
        {showVoiceCommands && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-300 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowVoiceCommands(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary-500/20 rounded-xl">
                  <Mic className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Voice Commands</h3>
                  <p className="text-sm text-gray-400">Try saying these commands</p>
                </div>
              </div>

              <div className="space-y-3">
                {voiceCommands.map((cmd, idx) => (
                  <div key={idx} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 flex justify-between items-center">
                    <span className="font-medium text-primary-300">{cmd.command}</span>
                    <span className="text-sm text-gray-500">{cmd.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Phonetic Name Modal */}
      <AnimatePresence>
        {showPhoneticModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-300 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowPhoneticModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary-500/20 rounded-xl">
                  <Edit2 className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Pronunciation</h3>
                  <p className="text-sm text-gray-400">How should I say your name?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Phonetic Spelling</label>
                  <input
                    type="text"
                    value={phoneticNameInput}
                    onChange={(e) => setPhoneticNameInput(e.target.value)}
                    placeholder="e.g. Siobhan -> Shiv-awn"
                    className="w-full bg-dark-400 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => speak(`Hello ${phoneticNameInput}`)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    Test
                  </button>
                  <button
                    onClick={handleSavePhoneticName}
                    className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice Command Confirmation Modal */}
      <AnimatePresence>
        {pendingCommand && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Confirmation Card */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative bg-dark-300 border border-primary-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary-500/20 rounded-xl">
                  <Mic className="w-6 h-6 text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">I heard you say:</h3>
                  <p className="text-gray-300 mb-4 italic">"{pendingCommand.transcript}"</p>
                  <p className="text-sm text-gray-400 mb-4">Is this correct?</p>

                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        await handleConfirmation('yes');
                      }}
                      className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium"
                    >
                      ✓ Yes
                    </button>
                    <button
                      onClick={async () => {
                        await handleConfirmation('no');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                    >
                      ↻ Say Again
                    </button>
                    <button
                      onClick={async () => {
                        await handleConfirmation('cancel');
                      }}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors font-medium"
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Say "yes", "no", or "cancel"
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative min-h-screen bg-dark-200 overflow-hidden text-white">
        {/* Background Wave */}
        <div className="absolute inset-0 opacity-50 pointer-events-none">
          <ParticleWave
            isSpeaking={isSpeaking}
            emotion={isSpeaking ? "listening" : "idle"}
            audioAnalyser={audioAnalyser}
          />
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aria-logo.png"
              alt="ARIA Logo"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h1 className="font-bold text-lg tracking-wide">ARIA</h1>
              <p className="text-xs text-gray-400">System Online</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-300/50 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${
                isProcessing ? 'bg-blue-500 animate-pulse' :
                isSpeaking ? 'bg-primary-500 animate-ping' :
                pendingCommand ? 'bg-yellow-500 animate-bounce' :
                isListeningForCommand ? 'bg-yellow-500 animate-pulse' :
                'bg-green-500 animate-pulse'
              }`} />
              <span className="text-xs text-gray-300">
                {isProcessing ? 'Processing...' :
                 isSpeaking ? 'Speaking...' :
                 pendingCommand ? 'Awaiting confirmation...' :
                 isListeningForCommand ? 'Awaiting command...' :
                 'Listening'}
              </span>
            </div>

            {currentIntent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="px-3 py-1.5 rounded-full bg-primary-500/20 border border-primary-500/30"
              >
                <span className="text-xs text-primary-300">{currentIntent}</span>
              </motion.div>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group cursor-pointer z-50"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group cursor-pointer z-50"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Main Content - Vertical Layout */}
        <div className="relative z-10 container mx-auto px-4 h-screen flex flex-col pt-24 pb-12">

          {/* Top: Welcome Message */}
          <div className="flex-none text-center">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-block relative group"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400 flex items-center justify-center gap-3">
                Welcome back, {user?.name?.split(' ')[0]}
                <button
                  onClick={() => setShowPhoneticModal(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  title="Edit pronunciation"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </h2>
              <p className="text-xl text-gray-400 font-light">
                How can I help you today?
              </p>
            </motion.div>
          </div>

          {/* Middle: Spacer */}
          <div className="grow flex flex-col items-center justify-center gap-8">
             {/* Optional: Visual cue for last command */}
             <AnimatePresence>
               {lastCommand && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full text-primary-300 text-sm backdrop-blur-sm"
                 >
                   Recognized: "{lastCommand}"
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Bottom: Widgets Grid */}
          <div className="flex-none w-full max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {menuItems.map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`
                    group relative p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300
                    ${item.active
                      ? 'bg-dark-300/40 border-primary-500/30 hover:border-primary-500/60 hover:bg-dark-300/60 cursor-pointer'
                      : 'bg-dark-300/20 border-white/5 opacity-60 cursor-not-allowed'}
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-xl mb-4 flex items-center justify-center
                    ${item.active ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-700/30 text-gray-500'}
                  `}>
                    <item.icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-semibold mb-1 group-hover:text-primary-400 transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {item.desc}
                  </p>

                  {item.active && (
                    <div className="absolute top-4 right-4">
                      <div className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

        </div>

        {/* Floating Info Button - Only show after onboarding is complete */}
        {user?.onboardingCompleted && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setShowVoiceCommands(true)}
            className="fixed bottom-8 right-8 z-50 p-4 bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-lg shadow-primary-600/30 transition-all hover:scale-110 cursor-pointer"
          >
            <Info className="w-6 h-6" />
          </motion.button>
        )}

      </div>
    </>
  );
}