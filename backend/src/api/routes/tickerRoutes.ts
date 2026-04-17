import { Router } from 'express';
import { tickerController } from '../controllers/TickerController';

const router = Router();

/**
 * Route: GET /
 * Summary: Fetches the current list of all market tickers and their latest known prices.
 * Details: Delegates the request to TickerController.getTickers.
 */
router.get('/', (req, res, next) => tickerController.getTickers(req, res).catch(next));

/**
 * Route: GET /history
 * Summary: Retrieves historical price data points for a specific ticker symbol via query param.
 * Details: Delegates the request to TickerController.getHistory.
 */
router.get('/history', (req, res, next) => tickerController.getHistory(req, res).catch(next));

export default router;