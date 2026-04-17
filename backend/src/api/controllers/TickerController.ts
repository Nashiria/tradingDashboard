import { Request, Response } from 'express';
import { marketDataService } from '../../di';

export class TickerController {
  public async getTickers(req: Request, res: Response): Promise<void> {
    try {
      const tickers = await marketDataService.getTickers();
      res.status(200).json(tickers);
    } catch (error) {
      console.error('Error fetching all tickers:', error);
      res.status(500).json({ message: 'Internal server error occurred while fetching tickers' });
    }
  }

  public async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const symbol = req.query.symbol as string;

      if (!symbol || symbol.trim() === '') {
        res.status(400).json({ message: 'Symbol parameter is required and cannot be empty' });
        return;
      }

      const history = await marketDataService.getHistory(symbol.toUpperCase());
      
      if (!history || history.length === 0) {
         res.status(404).json({ message: 'Ticker not found' });
         return;
      }
      
      res.status(200).json(history);
    } catch (error) {
      console.error(`Error fetching history for ticker ${req.query.symbol}:`, error);
      res.status(500).json({ message: 'Internal server error occurred while fetching ticker history' });
    }
  }
}

export const tickerController = new TickerController();