import assert from 'node:assert/strict';
import test from 'node:test';
import { Request, Response } from 'express';
import { TickerController } from '../src/api/controllers/TickerController';
import { ApiHttpError } from '../src/api/errors/ApiHttpError';
import { PriceUpdate } from '../src/domain/models/Ticker';

class MarketDataServiceStub {
  async getTickers() {
    return [
      {
        symbol: 'EUR/USD',
        name: 'Euro / US Dollar',
        basePrice: 1.085,
        currentPrice: 1.1234,
        type: 'Forex' as const,
        isFavorite: true,
        inPortfolio: true,
        icon: 'icon',
      },
    ];
  }

  async getTicker(symbol: string) {
    if (symbol !== 'EUR/USD') {
      return undefined;
    }

    return {
      symbol: 'EUR/USD',
      name: 'Euro / US Dollar',
      basePrice: 1.085,
      currentPrice: 1.1234,
      type: 'Forex' as const,
      isFavorite: true,
      inPortfolio: true,
      icon: 'icon',
    };
  }

  hasTicker(symbol: string) {
    return symbol === 'EUR/USD';
  }

  async getHistory(
    symbol: string,
    options?: { from?: number; to?: number; limit?: number },
  ): Promise<PriceUpdate[]> {
    assert.equal(symbol, 'EUR/USD');
    assert.deepEqual(options, { from: 1000, to: 2000, limit: 2 });

    return [
      { symbol: 'EUR/USD', price: 1.1, timestamp: 1000 },
      { symbol: 'EUR/USD', price: 1.2, timestamp: 2000 },
    ];
  }
}

function createResponseMock(): Response & {
  headers: Record<string, string>;
  statusCode: number;
  body: unknown;
} {
  const response = {
    headers: {} as Record<string, string>,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response as unknown as Response & {
    headers: Record<string, string>;
    statusCode: number;
    body: unknown;
  };
}

test('TickerController returns a single ticker payload', async () => {
  const controller = new TickerController(new MarketDataServiceStub());
  const req = { params: { symbol: 'eur/usd' } } as unknown as Request;
  const res = createResponseMock();

  await controller.getTicker(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['X-API-Version'], 'v1');
  assert.deepEqual(res.body, {
    version: 'v1',
    data: {
      symbol: 'EUR/USD',
      name: 'Euro / US Dollar',
      basePrice: 1.085,
      currentPrice: 1.1234,
      type: 'Forex',
      isFavorite: true,
      inPortfolio: true,
      icon: 'icon',
    },
    meta: {
      symbol: 'EUR/USD',
    },
  });
});

test('TickerController rejects invalid ticker symbols', async () => {
  const controller = new TickerController(new MarketDataServiceStub());
  const req = { params: { symbol: 'bad symbol!' } } as unknown as Request;

  await assert.rejects(
    controller.getTicker(req, createResponseMock()),
    (error: unknown) => {
      assert.ok(error instanceof ApiHttpError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 'INVALID_QUERY');
      return true;
    },
  );
});

test('TickerController rejects invalid history queries and unknown symbols', async () => {
  const controller = new TickerController(new MarketDataServiceStub());

  await assert.rejects(
    controller.getHistory(
      { query: { symbol: 'bad symbol!', limit: '0' } } as unknown as Request,
      createResponseMock(),
    ),
    (error: unknown) => {
      assert.ok(error instanceof ApiHttpError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 'INVALID_QUERY');
      assert.deepEqual(error.details, [
        {
          field: 'symbol',
          message:
            'Symbol must contain only letters, numbers, slashes, or dashes and be at most 15 characters.',
          value: 'bad symbol!',
        },
        {
          field: 'limit',
          message: 'limit must be between 1 and 600.',
          value: 0,
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    controller.getHistory(
      { query: { symbol: 'AAPL' } } as unknown as Request,
      createResponseMock(),
    ),
    (error: unknown) => {
      assert.ok(error instanceof ApiHttpError);
      assert.equal(error.status, 404);
      assert.equal(error.code, 'TICKER_NOT_FOUND');
      return true;
    },
  );
});

test('TickerController returns history payload with normalized query metadata', async () => {
  const controller = new TickerController(new MarketDataServiceStub());
  const res = createResponseMock();

  await controller.getHistory(
    {
      query: { symbol: 'eur/usd', from: '1000', to: '2000', limit: '2' },
    } as unknown as Request,
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    version: 'v1',
    data: [
      { symbol: 'EUR/USD', price: 1.1, timestamp: 1000 },
      { symbol: 'EUR/USD', price: 1.2, timestamp: 2000 },
    ],
    meta: {
      symbol: 'EUR/USD',
      count: 2,
      limit: 2,
      from: 1000,
      to: 2000,
    },
  });
});
