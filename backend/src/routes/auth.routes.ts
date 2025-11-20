import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  register,
  login,
  refreshAccessToken,
  logout,
  createHousehold,
  joinHousehold,
} from '../services/auth.service';

/* eslint-disable @typescript-eslint/no-misused-promises */

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneticName: z.string().optional(),
  inviteCode: z.string().length(8).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const createHouseholdSchema = z.object({
  name: z.string().min(2, 'Household name must be at least 2 characters'),
});

const joinHouseholdSchema = z.object({
  inviteCode: z.string().length(8, 'Invalid invite code'),
});

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validated = registerSchema.parse(req.body);

    const result = await register(validated);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          phoneticName: result.user.phoneticName,
          role: result.user.role,
          householdId: result.user.householdId,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message.includes('Invalid invite code')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);

    const result = await login(validated);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          phoneticName: result.user.phoneticName,
          role: result.user.role,
          householdId: result.user.householdId,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('Invalid email or password')) {
        return res.status(401).json({
          success: false,
          error: error.message,
        });
      }
    }

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const validated = refreshSchema.parse(req.body);

    const result = await refreshAccessToken(validated.refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('Invalid refresh token')) {
        return res.status(401).json({
          success: false,
          error: error.message,
        });
      }
    }

    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

/**
 * POST /auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const validated = refreshSchema.parse(req.body);

    await logout(validated.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * POST /household/create
 * Create a new household
 */
router.post('/household/create', async (req: Request, res: Response) => {
  try {
    const validated = createHouseholdSchema.parse(req.body);

    // TODO: Add authentication middleware to get userId from token
    const userId = req.body.userId; // Temporary until middleware is added

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const household = await createHousehold(validated.name, userId);

    res.status(201).json({
      success: true,
      data: {
        household: {
          id: household.id,
          name: household.name,
          inviteCode: household.inviteCode,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    console.error('Create household error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create household',
    });
  }
});

/**
 * POST /household/join
 * Join an existing household
 */
router.post('/household/join', async (req: Request, res: Response) => {
  try {
    const validated = joinHouseholdSchema.parse(req.body);

    // TODO: Add authentication middleware to get userId from token
    const userId = req.body.userId; // Temporary until middleware is added

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const household = await joinHousehold(userId, validated.inviteCode);

    res.status(200).json({
      success: true,
      data: {
        household: {
          id: household.id,
          name: household.name,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('Invalid invite code')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }

    console.error('Join household error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join household',
    });
  }
});

export default router;
