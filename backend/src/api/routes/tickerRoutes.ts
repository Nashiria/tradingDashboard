import { Router } from 'express';
import { TickerController } from '../controllers/TickerController';

export function createTickerRoutes(tickerController: TickerController): Router {
  const router = Router();

  router.get('/', (req, res, next) =>
    tickerController.getTickers(req, res).catch(next),
  );

  router.get('/history', (req, res, next) =>
    tickerController.getHistory(req, res).catch(next),
  );

  router.get('/:symbol', (req, res, next) =>
    tickerController.getTicker(req, res).catch(next),
  );

  return router;
}
