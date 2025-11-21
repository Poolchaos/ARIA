import { vi } from 'vitest';

export const MockMicVAD = {
  new: vi.fn().mockResolvedValue({
    start: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
  }),
};
