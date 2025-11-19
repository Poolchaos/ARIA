import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useVoiceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioQueue, setAudioQueue] = useState<Blob[]>([]);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const { user } = useAuthStore();

  // Auto-play audio queue
  useEffect(() => {
    if (isPlayingRef.current || audioQueue.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    setIsAIPlaying(true);
    const audioBlob = audioQueue[0];
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      isPlayingRef.current = false;
      setIsAIPlaying(false);
      currentAudioRef.current = null;
      setAudioQueue(prev => prev.slice(1));
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      isPlayingRef.current = false;
      setIsAIPlaying(false);
      currentAudioRef.current = null;
      setAudioQueue(prev => prev.slice(1));
    };

    audio.play().catch(() => {
      isPlayingRef.current = false;
      setIsAIPlaying(false);
      currentAudioRef.current = null;
      setAudioQueue(prev => prev.slice(1));
    });
  }, [audioQueue]);

  // Interrupt AI with smooth fade-out
  const interruptAI = useCallback(() => {
    const audio = currentAudioRef.current;
    if (!audio || audio.paused) return;

    // Clear any existing fade interval
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    // Smooth fade-out over 500ms
    const startVolume = audio.volume;
    const fadeSteps = 20;
    const stepDuration = 500 / fadeSteps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = startVolume * (1 - currentStep / fadeSteps);

      if (currentStep >= fadeSteps || newVolume <= 0) {
        audio.pause();
        audio.currentTime = 0;
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        isPlayingRef.current = false;
        setIsAIPlaying(false);
        currentAudioRef.current = null;
        // Clear the queue
        setAudioQueue([]);
      } else {
        audio.volume = newVolume;
      }
    }, stepDuration);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8002/voice/stream`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Send user context
      if (user) {
        ws.send(JSON.stringify({
          type: 'context',
          data: {
            userId: user.id,
            householdId: user.householdId,
            voicePreferences: {
              name: user.voiceName,
              pitch: user.voicePitch,
              rate: user.voiceRate,
              volume: user.voiceVolume,
            },
            llmProvider: user.llmProvider,
          },
        }));
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'transcript': {
            // User speech transcribed
            setMessages(prev => [...prev, {
              role: 'user',
              content: data.text,
              timestamp: new Date(),
            }]);
            break;
          }

          case 'response': {
            // Assistant text response
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: data.text,
              timestamp: new Date(),
            }]);
            break;
          }

          case 'audio': {
            // Assistant audio response
            const audioBlob = new Blob(
              [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
              { type: 'audio/mp3' }
            );
            setAudioQueue(prev => [...prev, audioBlob]);
            break;
          }

          case 'processing': {
            setIsProcessing(data.status === 'start');
            break;
          }

          case 'error': {
            console.error('Voice chat error:', data.message);
            break;
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [user]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendAudio = useCallback((audioBlob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Audio = (reader.result as string).split(',')[1];
      wsRef.current?.send(JSON.stringify({
        type: 'audio',
        data: base64Audio,
      }));
    };
    reader.readAsDataURL(audioBlob);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  return {
    messages,
    isConnected,
    isProcessing,
    isAIPlaying,
    connect,
    disconnect,
    sendAudio,
    clearMessages,
    interruptAI,
  };
}
