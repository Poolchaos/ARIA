import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/utils/password';

describe('Password Utilities', () => {
  const testPassword = 'SecurePassword123!';

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const hash = await hashPassword(testPassword);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(testPassword); // Hash should not match plaintext
      expect(hash.length).toBeGreaterThan(20); // Bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);

      // Bcrypt uses random salt, so hashes should differ
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword(testPassword, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword('WrongPassword123', hash);

      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    it('should handle case-sensitive passwords', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword('securepassword123!', hash);

      expect(isValid).toBe(false);
    });
  });
});
