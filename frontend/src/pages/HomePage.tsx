import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useState, useEffect, useRef } from 'react';
import { ParticleWave } from '@/components/auth/ParticleWave';
import { LogOut, Calendar, ShoppingCart, Wallet, Package, Mic, Info, X, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WAKE_WORD_RESPONSES = [
  "How can I help you?",
  "I'm listening.",
  "What can I do for you?",
  "Go ahead.",
  "I'm here.",
  "Ready when you are.",
  "What's on your mind?",
];

export function HomePage() {
  const navigate = useNavigate();
  const { user, refreshToken, logout, updateUser } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVoiceCommands, setShowVoiceCommands] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [showPhoneticModal, setShowPhoneticModal] = useState(false);
  const [phoneticNameInput, setPhoneticNameInput] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userRef = useRef(user);

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
    try {
      const storedVoice = localStorage.getItem('selectedVoice');
      const voice = storedVoice ? JSON.parse(storedVoice) : { name: 'en-US-Neural2-D' };

      setIsSpeaking(true);

      const response = await fetch('http://localhost:5001/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: voice.name,
          languageCode: voice.name.split('-').slice(0, 2).join('-'),
        }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const data = await response.json();
      if (!data.audioContent) return;

      const audioData = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  // Voice command detection
  useEffect(() => {
    // @ts-expect-error - SpeechRecognition is not in standard types yet
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim().toLowerCase();

      console.log('Voice input:', transcript);

      // Wake word detection
      if (transcript.includes('aria') || transcript.includes('hey aria')) {
        const responses = [...WAKE_WORD_RESPONSES];
        // Add personalized responses if name is available
        const currentUser = userRef.current;
        const nameToUse = currentUser?.phoneticName || currentUser?.name?.split(' ')[0];
        if (nameToUse) {
          responses.push(`Yes, ${nameToUse}?`);
          responses.push(`I'm here, ${nameToUse}.`);
          responses.push(`Hello, ${nameToUse}.`);
        }

        const response = responses[Math.floor(Math.random() * responses.length)];
        speak(response);
      }

      // Commands
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

    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting speech recognition:', e);
    }

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

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

      <div className="relative min-h-screen bg-dark-200 overflow-hidden text-white">
        {/* Background Wave */}
        <div className="absolute inset-0 opacity-50 pointer-events-none">
          <ParticleWave
            isSpeaking={isSpeaking}
            emotion={isSpeaking ? "listening" : "idle"}
            audioAnalyser={null}
          />
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center border border-primary-500/50">
              <span className="font-bold text-primary-400">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide">ARIA</h1>
              <p className="text-xs text-gray-400">System Online</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-300/50 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-primary-500 animate-ping' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-xs text-gray-300">{isSpeaking ? 'Processing...' : 'Listening'}</span>
            </div>

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

          {/* Middle: Spacer for Soundwave */}
          <div className="grow flex items-center justify-center">
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

        {/* Floating Info Button */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowVoiceCommands(true)}
          className="fixed bottom-8 right-8 z-50 p-4 bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-lg shadow-primary-600/30 transition-all hover:scale-110 cursor-pointer"
        >
          <Info className="w-6 h-6" />
        </motion.button>

      </div>
    </>
  );
}