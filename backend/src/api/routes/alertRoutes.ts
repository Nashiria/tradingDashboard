import { NextFunction, Request, Response, Router } from 'express';
import { AlertController } from '../controllers/AlertController';
import { requireAuth } from '../middleware/requireAuth';
import { assertAuthenticatedRequest } from '../types/auth';
import { AuthService } from '../../business/services/AuthService';

export function createAlertRoutes(
  alertController: AlertController,
  authService: AuthService,
): Router {
  const router = Router();

  router.use(requireAuth(authService));
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    assertAuthenticatedRequest(req);
    alertController.listAlerts(req, res).catch(next);
  });
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    assertAuthenticatedRequest(req);
    alertController.createAlert(req, res).catch(next);
  });
  router.delete(
    '/:alertId',
    (req: Request, res: Response, next: NextFunction) => {
      assertAuthenticatedRequest(req);
      alertController.deleteAlert(req, res).catch(next);
    },
  );

  return router;
}
