import crypto from 'crypto';

export function generateInviteCode(): string {
  // Generate 8-character alphanumeric code (uppercase for readability)
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export function generateTokenId(): string {
  return crypto.randomBytes(16).toString('hex');
}
