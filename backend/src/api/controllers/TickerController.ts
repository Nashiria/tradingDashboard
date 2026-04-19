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
