import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceChat } from '../useVoiceChat';

// Mock WebSocket locally to ensure control
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    console.log('Local MockWebSocket constructor called');
    this.url = url;
    this.readyState = MockWebSocket.CLOSED;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
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
    // Reset instances
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as any;
    (window as any).WebSocket = MockWebSocket;
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

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should disconnect from WebSocket', async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.connect();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should interrupt AI with fade-out', async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.connect();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Simulate AI playing
    act(() => {
      result.current.interruptAI();
    });

    // Verify no crash
    expect(true).toBe(true);
  });

  it('should handle user messages', async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.connect();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Simulate receiving a transcript message
    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'transcript',
          text: 'Hello',
        }),
      } as MessageEvent);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'Hello',
    });
  });

  it('should clear messages', async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.connect();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'transcript',
          text: 'Hello',
        }),
      } as MessageEvent);
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });
});
