import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock Web Speech API
import { MockSpeechRecognition, mockSpeechSynthesis, MockSpeechSynthesisUtterance } from './mocks/webSpeechApi';
import { MockMicVAD } from './mocks/vad';
import { MockWebSocket } from './mocks/websocket';
import { vi } from 'vitest';

// @ts-ignore
window.SpeechRecognition = MockSpeechRecognition;
// @ts-ignore
window.webkitSpeechRecognition = MockSpeechRecognition;
// @ts-ignore
window.speechSynthesis = mockSpeechSynthesis;
// @ts-ignore
window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

// Mock VAD
vi.mock('@ricky0123/vad-web', () => ({
  MicVAD: MockMicVAD,
}));

// Mock WebSocket
// @ts-ignore
global.WebSocket = MockWebSocket;

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  currentTime: 0,
  volume: 1,
  onended: null,
  onerror: null,
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();
