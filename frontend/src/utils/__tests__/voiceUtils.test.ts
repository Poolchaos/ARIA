import { describe, it, expect } from 'vitest';
import { isStandaloneWord, containsAnyWord, isSystemEcho } from '../voiceUtils';

describe('voiceUtils', () => {
  describe('isStandaloneWord', () => {
    it('should find exact matches', () => {
      expect(isStandaloneWord('yes', 'yes')).toBe(true);
      expect(isStandaloneWord('no', 'no')).toBe(true);
    });

    it('should find matches in sentences', () => {
      expect(isStandaloneWord('yes please', 'yes')).toBe(true);
      expect(isStandaloneWord('oh no don\'t', 'no')).toBe(true);
    });

    it('should not find partial matches', () => {
      expect(isStandaloneWord('yesterday', 'yes')).toBe(false);
      expect(isStandaloneWord('know', 'no')).toBe(false);
      expect(isStandaloneWord('now', 'no')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isStandaloneWord('YES', 'yes')).toBe(true);
      expect(isStandaloneWord('No', 'no')).toBe(true);
    });
  });

  describe('containsAnyWord', () => {
    it('should return true if any word matches', () => {
      const targets = ['yes', 'yep', 'yeah'];
      expect(containsAnyWord('yeah sure', targets)).toBe(true);
      expect(containsAnyWord('yep', targets)).toBe(true);
    });

    it('should return false if no words match', () => {
      const targets = ['yes', 'yep', 'yeah'];
      expect(containsAnyWord('nope', targets)).toBe(false);
    });
  });

  describe('isSystemEcho', () => {
    it('should detect system phrases', () => {
      expect(isSystemEcho('is that correct')).toBe(true);
      expect(isSystemEcho('wait is that correct')).toBe(true);
    });

    it('should not flag user speech', () => {
      expect(isSystemEcho('yes that is right')).toBe(false);
      expect(isSystemEcho('navigate to login')).toBe(false);
    });
  });
});
