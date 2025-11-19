import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  register,
  login,
  refreshAccessToken,
  logout,
  createHousehold,
  joinHousehold,
} from '../src/services/auth.service';
import { verifyAccessToken, verifyRefreshToken } from '../src/utils/jwt';

const prisma = new PrismaClient();

// Test constants - NOT real credentials
const TEST_PASSWORD = 'SecureTestPass123!';
const TEST_PASSWORD_ALT = 'AnotherTestPass456!';

describe('Auth Service', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.household.deleteMany();
  });

  afterEach(async () => {
    // Clean up after tests
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.household.deleteMany();
  });

  describe('register', () => {
    it('should register new user and create household as admin', async () => {
      const result = await register({
        email: 'test@example.com',
        password: TEST_PASSWORD,
        name: 'Test User',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.role).toBe('admin');
      expect(result.user.householdId).toBeTruthy();

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();

      // Verify tokens
      const accessPayload = verifyAccessToken(result.accessToken);
      expect(accessPayload.userId).toBe(result.user.id);
      expect(accessPayload.householdId).toBe(result.user.householdId);
      expect(accessPayload.role).toBe('admin');

      // Verify household was created
      const household = await prisma.household.findUnique({
        where: { id: result.user.householdId },
      });
      expect(household).toBeTruthy();
      expect(household?.createdById).toBe(result.user.id);
    });

    it('should register user with invite code as member', async () => {
      // Create existing household
      const existingHousehold = await prisma.household.create({
        data: {
          name: 'Existing Household',
          inviteCode: 'TESTCODE',
          createdById: 'existing-user-id',
        },
      });

      const result = await register({
        email: 'member@example.com',
        password: TEST_PASSWORD,
        name: 'Member User',
        inviteCode: 'TESTCODE',
      });

      expect(result.user.role).toBe('member');
      expect(result.user.householdId).toBe(existingHousehold.id);
    });

    it('should reject duplicate email', async () => {
      await register({
        email: 'duplicate@example.com',
        password: TEST_PASSWORD,
        name: 'User One',
      });

      await expect(
        register({
          email: 'duplicate@example.com',
          password: TEST_PASSWORD_ALT,
          name: 'User Two',
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should reject invalid invite code', async () => {
      await expect(
        register({
          email: 'test@example.com',
          password: TEST_PASSWORD,
          name: 'Test User',
          inviteCode: 'INVALID',
        })
      ).rejects.toThrow('Invalid invite code');
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      // Register user first
      const registered = await register({
        email: 'login@example.com',
        password: TEST_PASSWORD,
        name: 'Login User',
      });

      // Wait to ensure different token timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Login
      const result = await login({
        email: 'login@example.com',
        password: TEST_PASSWORD,
      });

      expect(result.user.id).toBe(registered.user.id);
      expect(result.user.email).toBe('login@example.com');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should reject wrong password', async () => {
      await register({
        email: 'test@example.com',
        password: 'CorrectPass123!',
        name: 'Test User',
      });

      await expect(
        login({
          email: 'test@example.com',
          password: 'WrongPass123!',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'AnyPass123!',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const registered = await register({
        email: 'refresh@example.com',
        password: TEST_PASSWORD,
        name: 'Refresh User',
      });

      // Wait to ensure different token timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await refreshAccessToken(registered.refreshToken);

      expect(result.accessToken).toBeTruthy();

      // Verify new access token
      const payload = verifyAccessToken(result.accessToken);
      expect(payload.userId).toBe(registered.user.id);
    });

    it('should reject invalid refresh token', async () => {
      await expect(refreshAccessToken('invalid-token')).rejects.toThrow();
    });

    it('should reject refresh token not in database', async () => {
      const { generateRefreshToken } = await import('../src/utils/jwt');
      const { generateTokenId } = await import('../src/utils/crypto');
      const fakeToken = generateRefreshToken('fake-user', generateTokenId());

      await expect(refreshAccessToken(fakeToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should delete refresh token from database', async () => {
      const registered = await register({
        email: 'logout@example.com',
        password: TEST_PASSWORD,
        name: 'Logout User',
      });

      // Verify token exists
      const tokenBefore = await prisma.refreshToken.findUnique({
        where: { token: registered.refreshToken },
      });
      expect(tokenBefore).toBeTruthy();

      // Logout
      await logout(registered.refreshToken);

      // Verify token deleted
      const tokenAfter = await prisma.refreshToken.findUnique({
        where: { token: registered.refreshToken },
      });
      expect(tokenAfter).toBeNull();
    });

    it('should not throw error for non-existent token', async () => {
      await expect(logout('non-existent-token')).resolves.not.toThrow();
    });
  });

  describe('createHousehold', () => {
    it('should create household with invite code', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'creator@example.com',
          passwordHash: 'hash',
          name: 'Creator',
          role: 'admin',
          household: {
            create: {
              name: 'Initial Household',
              inviteCode: 'INIT',
              createdById: 'temp',
            },
          },
        },
      });

      const result = await createHousehold('New Household', user.id);

      expect(result.id).toBeTruthy();
      expect(result.name).toBe('New Household');
      expect(result.inviteCode).toBeTruthy();
      expect(result.inviteCode.length).toBe(8);

      // Verify household in database
      const household = await prisma.household.findUnique({
        where: { id: result.id },
      });
      expect(household).toBeTruthy();
      expect(household?.createdById).toBe(user.id);
    });
  });

  describe('joinHousehold', () => {
    it('should add user to existing household', async () => {
      // Create household
      const household = await prisma.household.create({
        data: {
          name: 'Join Test Household',
          inviteCode: 'JOINCODE',
          createdById: 'admin-id',
        },
      });

      // Create user in different household
      const user = await prisma.user.create({
        data: {
          email: 'joiner@example.com',
          passwordHash: 'hash',
          name: 'Joiner',
          role: 'member',
          household: {
            create: {
              name: 'Old Household',
              inviteCode: 'OLDCODE',
              createdById: 'old-admin',
            },
          },
        },
      });

      const result = await joinHousehold(user.id, 'JOINCODE');

      expect(result.id).toBe(household.id);
      expect(result.name).toBe('Join Test Household');

      // Verify user updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.householdId).toBe(household.id);
    });

    it('should reject invalid invite code', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'joiner@example.com',
          passwordHash: 'hash',
          name: 'Joiner',
          role: 'member',
          household: {
            create: {
              name: 'Household',
              inviteCode: 'CODE',
              createdById: 'admin',
            },
          },
        },
      });

      await expect(joinHousehold(user.id, 'INVALID')).rejects.toThrow('Invalid invite code');
    });
  });
});
