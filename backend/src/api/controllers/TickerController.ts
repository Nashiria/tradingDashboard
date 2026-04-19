import { Request, Response } from 'express';
import {
  HistoryOptions,
  MarketDataReadPort,
} from '../../business/services/MarketDataService';
import { sendSuccess } from '../contracts/apiResponse';
import {
  parseHistoryQuery,
  parseTickerSymbol,
  toPriceUpdateDto,
  toTickerDto,
} from '../contracts/tickerContracts';
import { ApiHttpError } from '../errors/ApiHttpError';

export class TickerController {
  constructor(private readonly marketDataService: MarketDataReadPort) {}

  /**
   * Summary: Retrieves the current market data for all available tickers.
   * Controller: TickerController.getTickers
   * Route: GET /api/tickers
   *
   * @returns A promise resolving to void.
   *
   * Responses:
   * - Status 200: Successfully returns the list of all current tickers.
   * - Status 500: Internal server error.
   */
  public async getTickers(req: Request, res: Response): Promise<void> {
    const tickers = await this.marketDataService.getTickers();
    sendSuccess(res, 200, tickers.map(toTickerDto), { count: tickers.length });
  }

  public async getTicker(req: Request, res: Response): Promise<void> {
    const parsedSymbol = parseTickerSymbol(req.params.symbol);

    if (!parsedSymbol.value) {
      throw new ApiHttpError(
        400,
        'INVALID_QUERY',
        'Request path parameters are invalid.',
        parsedSymbol.errors,
      );
    }

    const ticker = await this.marketDataService.getTicker(
      parsedSymbol.value.symbol,
    );

    if (!ticker) {
      throw new ApiHttpError(404, 'TICKER_NOT_FOUND', 'Ticker not found');
    }

    sendSuccess(res, 200, toTickerDto(ticker), { symbol: ticker.symbol });
  }

  /**
   * Summary: Retrieves historical market data for a specific ticker symbol.
   * Controller: TickerController.getHistory
   * Route: GET /api/tickers/history?symbol=:symbol
   *
   * @param symbol - The ticker symbol to look up (query parameter).
   * @returns A promise resolving to void.
   *
   * Responses:
   * - Status 200: Successfully returns the historical data for the requested ticker.
   * - Status 400: Bad request due to invalid parameters.
   * - Status 404: Ticker not found.
   * - Status 500: Internal server error.
   */
  public async getHistory(req: Request, res: Response): Promise<void> {
    const parsedQuery = parseHistoryQuery(req.query);

    if (!parsedQuery.value) {
      throw new ApiHttpError(
        400,
        'INVALID_QUERY',
        'Request query parameters are invalid.',
        parsedQuery.errors,
      );
    }

    const { symbol, from, to, limit } = parsedQuery.value;

    if (!this.marketDataService.hasTicker(symbol)) {
      throw new ApiHttpError(404, 'TICKER_NOT_FOUND', 'Ticker not found');
    }

    const history = await this.marketDataService.getHistory(symbol, {
      from,
      to,
      limit,
    } satisfies HistoryOptions);

    sendSuccess(res, 200, history.map(toPriceUpdateDto), {
      symbol,
      count: history.length,
      limit,
      ...(from === undefined ? {} : { from }),
      ...(to === undefined ? {} : { to }),
    });
  }
}
