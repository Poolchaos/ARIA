import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../src/utils/jwt';

describe('JWT Utilities', () => {
  const testUserId = 'user123';
  const testHouseholdId = 'household456';
  const testRole = 'member';
  const testTokenId = 'token789';

  describe('generateAccessToken', () => {
    it('should generate valid access token with correct payload', () => {
      const token = generateAccessToken(testUserId, testHouseholdId, testRole);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.householdId).toBe(testHouseholdId);
      expect(decoded.role).toBe(testRole);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token with correct payload', () => {
      const token = generateRefreshToken(testUserId, testTokenId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.tokenId).toBe(testTokenId);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(testUserId, testHouseholdId, testRole);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.householdId).toBe(testHouseholdId);
      expect(decoded.role).toBe(testRole);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyAccessToken('not.a.valid.jwt')).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(testUserId, testTokenId);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.tokenId).toBe(testTokenId);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow();
    });
  });

  describe('getRefreshTokenExpiry', () => {
    it('should return date 7 days in future', () => {
      const expiry = getRefreshTokenExpiry();
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Allow 1 second difference for test execution time
      const diff = Math.abs(expiry.getTime() - sevenDaysFromNow.getTime());
      expect(diff).toBeLessThan(1000);
    });

    it('should return future date', () => {
      const expiry = getRefreshTokenExpiry();
      const now = new Date();

      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });
  });
});
