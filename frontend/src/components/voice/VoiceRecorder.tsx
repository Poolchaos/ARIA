import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscript?: (text: string) => void;
  onAudioData?: (blob: Blob) => void;
}

export function VoiceRecorder({ onTranscript, onAudioData }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Set up audio visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (onAudioData) {
          onAudioData(audioBlob);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        setAudioLevel(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      updateAudioLevel();
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="relative">
        {/* Audio level visualization */}
        {isRecording && (
          <div
            className="absolute inset-0 rounded-full bg-primary-500/30 animate-pulse"
            style={{
              transform: `scale(${1 + audioLevel * 0.5})`,
              transition: 'transform 0.1s ease-out',
            }}
          />
        )}

        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`
            relative z-10 p-6 rounded-full transition-all duration-200
            ${isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            disabled:bg-gray-400
            shadow-lg hover:shadow-xl
            focus:outline-none focus:ring-4 focus:ring-primary-500/50
          `}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <MicOff className="w-8 h-8" />
          ) : isProcessing ? (
            <Volume2 className="w-8 h-8 animate-pulse" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {isRecording
          ? 'Recording... Click to stop'
          : isProcessing
          ? 'Processing...'
          : 'Click to start talking'}
      </p>
    </div>
  );
}
