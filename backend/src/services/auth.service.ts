import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../utils/jwt';
import { generateInviteCode, generateTokenId } from '../utils/crypto';

const prisma = new PrismaClient();

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  inviteCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  householdId: string;
}

export async function register(input: RegisterInput) {
  const { email, password, name, inviteCode } = input;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  let householdId: string;
  let role = 'member';

  if (inviteCode) {
    // Join existing household
    const household = await prisma.household.findUnique({
      where: { inviteCode },
    });

    if (!household) {
      throw new Error('Invalid invite code');
    }

    householdId = household.id;
  } else {
    // Create new household (user becomes admin)
    const newHousehold = await prisma.household.create({
      data: {
        name: `${name}'s Household`,
        inviteCode: generateInviteCode(),
        createdById: 'temp', // Will update after user creation
      },
    });

    householdId = newHousehold.id;
    role = 'admin';
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
      householdId,
    },
  });

  // Update household createdById if new household
  if (role === 'admin') {
    await prisma.household.update({
      where: { id: householdId },
      data: { createdById: user.id },
    });
  }

  // Generate tokens
  const tokenId = generateTokenId();
  const accessToken = generateAccessToken(user.id, householdId, role);
  const refreshToken = generateRefreshToken(user.id, tokenId);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  const userResponse: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    householdId: user.householdId,
  };

  return { user: userResponse, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const { email, password } = input;

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const tokenId = generateTokenId();
  const accessToken = generateAccessToken(user.id, user.householdId, user.role);
  const refreshToken = generateRefreshToken(user.id, tokenId);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  const userResponse: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    householdId: user.householdId,
  };

  return { user: userResponse, accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  // Verify refresh token (will throw if invalid/expired)
  const { verifyRefreshToken } = await import('../utils/jwt');
  verifyRefreshToken(refreshToken);

  // Check if token exists in database
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new Error('Invalid refresh token');
  }

  // Check if token is expired
  if (tokenRecord.expiresAt < new Date()) {
    // Delete expired token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    throw new Error('Refresh token expired');
  }

  // Generate new access token
  const user = tokenRecord.user;
  const accessToken = generateAccessToken(user.id, user.householdId, user.role);

  return { accessToken };
}

export async function logout(refreshToken: string) {
  // Delete refresh token from database
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export async function createHousehold(name: string, creatorId: string) {
  const inviteCode = generateInviteCode();

  const household = await prisma.household.create({
    data: {
      name,
      inviteCode,
      createdById: creatorId,
    },
  });

  return {
    id: household.id,
    name: household.name,
    inviteCode: household.inviteCode,
  };
}

export async function joinHousehold(userId: string, inviteCode: string) {
  const household = await prisma.household.findUnique({
    where: { inviteCode },
  });

  if (!household) {
    throw new Error('Invalid invite code');
  }

  // Update user's household
  await prisma.user.update({
    where: { id: userId },
    data: { householdId: household.id },
  });

  return {
    id: household.id,
    name: household.name,
  };
}
