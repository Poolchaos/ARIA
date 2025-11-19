import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        householdId: string;
        role: 'admin' | 'member';
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT access token
 * Expects Authorization header: Bearer <token>
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No authorization header provided',
      });
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format. Expected: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    // Verify and decode token
    const payload = verifyAccessToken(token);

    // Attach user data to request
    req.user = {
      userId: payload.userId,
      householdId: payload.householdId,
      role: payload.role as 'admin' | 'member',
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        res.status(401).json({
          success: false,
          error: 'Token expired',
        });
        return;
      }

      if (error.message.includes('invalid')) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
        return;
      }
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Middleware to require specific role(s)
 * Must be used after authenticateToken middleware
 */
export const requireRole = (...allowedRoles: Array<'admin' | 'member'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to verify user belongs to the household in request
 * Expects householdId in request params or body
 */
export const verifyHouseholdAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const householdId = req.params.householdId || req.body.householdId;

  if (!householdId) {
    res.status(400).json({
      success: false,
      error: 'Household ID required',
    });
    return;
  }

  if (req.user.householdId !== householdId) {
    res.status(403).json({
      success: false,
      error: 'Access denied. You do not belong to this household',
    });
    return;
  }

  next();
};
