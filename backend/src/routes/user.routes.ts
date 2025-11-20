import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Update user preferences schema
const updatePreferencesSchema = z.object({
  voiceName: z.string().optional(),
  voicePitch: z.number().min(0.5).max(2.0).optional(),
  voiceRate: z.number().min(0.5).max(2.0).optional(),
  voiceVolume: z.number().min(0).max(1).optional(),
  selectedAvatar: z.string().optional(),
  selectedAvatarColor: z.string().optional(),
  selectedPersonality: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
  phoneticName: z.string().optional(),
});

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
router.patch('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const validatedData = updatePreferencesSchema.parse(req.body);

    // eslint-disable-next-line no-console
    console.log('[user.routes] Updating preferences for user:', userId, validatedData);

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        phoneticName: true,
        role: true,
        householdId: true,
        voiceName: true,
        voicePitch: true,
        voiceRate: true,
        voiceVolume: true,
        selectedAvatar: true,
        selectedAvatarColor: true,
        selectedPersonality: true,
        onboardingCompleted: true,
      },
    });

    // eslint-disable-next-line no-console
    console.log('[user.routes] User preferences updated successfully');

    res.json({
      success: true,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('[user.routes] Error updating preferences:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Failed to update preferences',
    });
  }
});

/**
 * GET /api/user/me
 * Get current user details
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phoneticName: true,
        role: true,
        householdId: true,
        voiceName: true,
        voicePitch: true,
        voiceRate: true,
        voiceVolume: true,
        selectedAvatar: true,
        selectedAvatarColor: true,
        selectedPersonality: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('[user.routes] Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
