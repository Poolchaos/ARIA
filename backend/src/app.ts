import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3004',
    credentials: true,
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/auth', authRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  });

  return app;
};
