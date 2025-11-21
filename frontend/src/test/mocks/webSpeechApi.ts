import { vi } from 'vitest';

export class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onresult: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onstart: (() => void) | null = null;

  start = vi.fn(() => {
    if (this.onstart) this.onstart();
  });

  stop = vi.fn(() => {
    if (this.onend) this.onend();
  });

  abort = vi.fn();

  // Helper to simulate voice input
  emitResult(transcript: string, isFinal = true) {
    if (this.onresult) {
      const event = {
        results: [
          {
            0: { transcript, confidence: 1 },
            isFinal,
            length: 1,
          },
        ],
        resultIndex: 0,
      };
      // Add length property to results array to mimic SpeechRecognitionResultList
      Object.defineProperty(event.results, 'length', { value: 1 });
      this.onresult(event);
    }
  }

  emitError(error: string) {
    if (this.onerror) {
      this.onerror({ error });
    }
  }
}

export const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
};

export const MockSpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: 'en-US',
  pitch: 1,
  rate: 1,
  volume: 1,
  onend: null,
  onerror: null,
  onstart: null,
}));
