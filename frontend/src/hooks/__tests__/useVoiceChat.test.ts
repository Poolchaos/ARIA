import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceChat } from '../useVoiceChat';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

// Mock Audio
class MockAudio {
  src = '';
  volume = 1;
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src?: string) {
    if (src) this.src = src;
  }

  async play() {
    this.paused = false;
    setTimeout(() => {
      this.paused = true;
      this.onended?.();
    }, 100);
  }

  pause() {
    this.paused = true;
  }
}

describe('useVoiceChat', () => {
  beforeEach(() => {
    global.WebSocket = MockWebSocket as any;
    global.Audio = MockAudio as any;
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useVoiceChat());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it('should connect to WebSocket', async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.connect();
    });

    await vi.runAllTimersAsync();

    expect(result.current.isConnected).toBe(true);
  });

  it('should disconnect from WebSocket', async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.connect();
    });

    await vi.runAllTimersAsync();

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should interrupt AI with fade-out', async () => {
    const { result } = renderHook(() => useVoiceChat());

    // Simulate AI playing audio
    const audioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    
    act(() => {
      result.current.connect();
    });

    await vi.runAllTimersAsync();

    // Trigger interrupt
    act(() => {
      result.current.interruptAI();
    });

    await vi.runAllTimersAsync();

    expect(result.current.isAIPlaying).toBe(false);
  });

  it('should handle user messages', async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.connect();
    });

    await vi.runAllTimersAsync();

    // Simulate receiving a transcript message
    const mockMessage = {
      type: 'transcript',
      text: 'Hello ARIA',
    };

    // Get the WebSocket instance and trigger message
    const ws = (global.WebSocket as any).mock?.instances?.[0];
    if (ws?.onmessage) {
      act(() => {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify(mockMessage),
        }));
      });
    }

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'Hello ARIA',
    });
  });

  it('should clear messages', () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });
});
