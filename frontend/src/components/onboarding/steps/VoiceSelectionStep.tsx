import { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Check } from 'lucide-react';

interface Voice {
  id: string;
  name: string;
  displayName: string;
  gender: 'male' | 'female';
  accent: string;
  description: string;
}

const AVAILABLE_VOICES: Voice[] = [
  { id: 'en-US-Neural2-D', name: 'en-US-Neural2-D', displayName: 'David', gender: 'male', accent: 'American', description: 'Deep and calm' },
  { id: 'en-US-Neural2-A', name: 'en-US-Neural2-A', displayName: 'Alex', gender: 'male', accent: 'American', description: 'Neutral and professional' },
  { id: 'en-US-Neural2-F', name: 'en-US-Neural2-F', displayName: 'Aria', gender: 'female', accent: 'American', description: 'Friendly and expressive' },
  { id: 'en-US-Neural2-C', name: 'en-US-Neural2-C', displayName: 'Clara', gender: 'female', accent: 'American', description: 'Soft and calm' },
  { id: 'en-GB-Neural2-B', name: 'en-GB-Neural2-B', displayName: 'George', gender: 'male', accent: 'British', description: 'Sophisticated British' },
  { id: 'en-GB-Neural2-A', name: 'en-GB-Neural2-A', displayName: 'Sarah', gender: 'female', accent: 'British', description: 'Elegant British' },
];

interface VoiceSelectionStepProps {
  onNext: () => void;
  onBack: () => void;
  onVoicePreview: (isPlaying: boolean) => void;
}

export function VoiceSelectionStep({ onNext, onBack, onVoicePreview }: VoiceSelectionStepProps) {
  const [selectedVoice, setSelectedVoice] = useState<Voice>(AVAILABLE_VOICES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [volume, setVolume] = useState(1.0);

  const filteredVoices = AVAILABLE_VOICES.filter(v =>
    gender === 'all' || v.gender === gender
  );

  const playVoicePreview = async (voice: Voice) => {
    if (isPlaying) return;

    try {
      setIsPlaying(true);
      onVoicePreview(true);

      const response = await fetch('http://localhost:8002/voice/test-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hi! I'm ${voice.displayName}. I'll be your voice assistant.`,
          voice_name: voice.name,
        }),
      });

      const data = await response.json();
      const audioData = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = volume;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        onVoicePreview(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        onVoicePreview(false);
      };

      await audio.play();
    } catch (error) {
      console.error('Voice preview error:', error);
      setIsPlaying(false);
      onVoicePreview(false);
    }
  };

  const handleContinue = () => {
    // Save voice preference to local storage
    localStorage.setItem('selectedVoice', JSON.stringify(selectedVoice));
    localStorage.setItem('voiceVolume', volume.toString());
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
          Choose Your Voice
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400"
        >
          Select a voice that sounds best to you
        </motion.p>
      </div>

      {/* Volume Control */}
      <div className="mb-6 px-4">
        <div className="flex items-center gap-4 max-w-md mx-auto bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <Volume2 className="w-5 h-5 text-gray-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <span className="text-sm text-gray-400 w-8 text-right">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      {/* Gender filter */}
      <div className="flex justify-center gap-2 mb-6">
        {(['all', 'male', 'female'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              gender === g
                ? 'bg-primary-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {g === 'all' ? 'All Voices' : `${g.charAt(0).toUpperCase() + g.slice(1)} Voices`}
          </button>
        ))}
      </div>

      {/* Voice grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 flex-1 overflow-y-auto">
        {filteredVoices.map((voice) => (
          <motion.div
            key={voice.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedVoice(voice)}
            className={`relative p-4 rounded-xl cursor-pointer transition-all ${
              selectedVoice.id === voice.id
                ? 'bg-primary-500/20 border-2 border-primary-500'
                : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-600'
            }`}
          >
            {selectedVoice.id === voice.id && (
              <div className="absolute top-3 right-3">
                <Check className="w-5 h-5 text-primary-400" />
              </div>
            )}

            <div className="flex items-start gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playVoicePreview(voice);
                }}
                disabled={isPlaying}
                className="p-2 bg-primary-500/20 rounded-full hover:bg-primary-500/30 disabled:opacity-50"
              >
                <Volume2 className="w-5 h-5 text-primary-400" />
              </button>

              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">{voice.displayName}</h3>
                <p className="text-sm text-gray-400 mb-1">{voice.accent}</p>
                <p className="text-xs text-gray-500">{voice.description}</p>
              </div>
            </div>
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
