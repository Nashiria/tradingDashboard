import { Router } from 'express';
import { TickerController } from '../controllers/TickerController';

export function createTickerRoutes(tickerController: TickerController): Router {
  const router = Router();

  /**
   * Route: GET /
   * Summary: Fetches the current list of all market tickers and their latest known prices.
   * Details: Delegates the request to TickerController.getTickers.
   */
  router.get('/', (req, res, next) =>
    tickerController.getTickers(req, res).catch(next),
  );

  /**
   * Route: GET /history
   * Summary: Retrieves historical price data points for a specific ticker symbol via query params.
   * Details: Delegates the request to TickerController.getHistory.
   */
  router.get('/history', (req, res, next) =>
    tickerController.getHistory(req, res).catch(next),
  );

  /**
   * Route: GET /:symbol
   * Summary: Fetches the latest known market snapshot for a single ticker symbol.
   * Details: Delegates the request to TickerController.getTicker.
   */
  router.get('/:symbol', (req, res, next) =>
    tickerController.getTicker(req, res).catch(next),
  );

  return router;
}
