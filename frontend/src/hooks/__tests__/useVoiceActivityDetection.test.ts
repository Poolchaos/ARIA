import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceActivityDetection } from '../useVoiceActivityDetection';

// Mock VAD
const mockVAD = {
  start: vi.fn(),
  pause: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('@ricky0123/vad-web', () => ({
  MicVAD: {
    new: vi.fn(async (options) => {
      // Store callbacks for testing
      (mockVAD as any).onSpeechStart = options.onSpeechStart;
      (mockVAD as any).onSpeechEnd = options.onSpeechEnd;
      return mockVAD;
    }),
  },
}));

describe('useVoiceActivityDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('should initialize with not listening state', () => {
    const { result } = renderHook(() =>
      useVoiceActivityDetection({ enabled: false })
    );

    expect(result.current.isListening).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
  });

  it('should start VAD when enabled', async () => {
    const onSpeechStart = vi.fn();
    const onSpeechEnd = vi.fn();

    const { result } = renderHook(() =>
      useVoiceActivityDetection({
        enabled: true,
        onSpeechStart,
        onSpeechEnd,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockVAD.start).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);
  });

  it('should call onSpeechStart when speech detected', async () => {
    const onSpeechStart = vi.fn();

    renderHook(() =>
      useVoiceActivityDetection({
        enabled: true,
        onSpeechStart,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Trigger speech start
    act(() => {
      (mockVAD as any).onSpeechStart?.();
    });

    expect(onSpeechStart).toHaveBeenCalled();
  });

  it('should call onSpeechEnd when speech ends', async () => {
    const onSpeechEnd = vi.fn();

    renderHook(() =>
      useVoiceActivityDetection({
        enabled: true,
        onSpeechEnd,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Trigger speech end
    act(() => {
      (mockVAD as any).onSpeechEnd?.();
    });

    expect(onSpeechEnd).toHaveBeenCalled();
  });

  it('should stop VAD when disabled', async () => {
    const { result, rerender } = renderHook(
      (props) => useVoiceActivityDetection(props),
      {
        initialProps: { enabled: true },
      }
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isListening).toBe(true);

    // Disable
    rerender({ enabled: false });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockVAD.destroy).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('should pause and resume VAD', async () => {
    const { result } = renderHook(() =>
      useVoiceActivityDetection({ enabled: true })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.pause();
    });

    expect(mockVAD.pause).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);

    act(() => {
      result.current.resume();
    });

    expect(mockVAD.start).toHaveBeenCalledTimes(2);
    expect(result.current.isListening).toBe(true);
  });

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() =>
      useVoiceActivityDetection({ enabled: true })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    unmount();

    expect(mockVAD.destroy).toHaveBeenCalled();
  });
});
