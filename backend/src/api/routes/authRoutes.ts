import { NextFunction, Request, Response, Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middleware/requireAuth';
import { assertAuthenticatedRequest } from '../types/auth';
import { AuthService } from '../../business/services/AuthService';

export function createAuthRoutes(
  authController: AuthController,
  authService: AuthService,
): Router {
  const router = Router();

  router.post('/login', (req: Request, res: Response, next: NextFunction) =>
    authController.login(req, res).catch(next),
  );

  router.post('/logout', (req: Request, res: Response, next: NextFunction) =>
    authController.logout(req, res).catch(next),
  );

  router.get(
    '/me',
    requireAuth(authService),
    (req: Request, res: Response, next: NextFunction) => {
      assertAuthenticatedRequest(req);
      authController.me(req, res).catch(next);
    },
  );

  return router;
}
