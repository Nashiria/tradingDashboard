import assert from 'node:assert/strict';
import test from 'node:test';
import { Response } from 'express';
import { AlertController } from '../src/api/controllers/AlertController';
import { AuthenticatedRequest } from '../src/api/types/auth';
import { PriceAlert } from '../src/domain/models/Alert';

class AlertServiceStub {
  public createdInputs: unknown[] = [];
  public deletedInputs: Array<{ userId: string; alertId: string }> = [];

  constructor(
    private readonly alerts: PriceAlert[] = [],
    private readonly createResult?: PriceAlert,
    private readonly deleteResult = true,
  ) {}

  async listAlerts(userId: string): Promise<PriceAlert[]> {
    assert.equal(userId, 'user-1');
    return this.alerts;
  }

  async createAlert(input: unknown): Promise<PriceAlert> {
    this.createdInputs.push(input);
    assert.ok(this.createResult);
    return this.createResult;
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    this.deletedInputs.push({ userId, alertId });
    return this.deleteResult;
  }
}

class MarketDataServiceStub {
  constructor(private readonly validSymbols: string[] = ['EUR/USD']) {}

  hasTicker(symbol: string): boolean {
    return this.validSymbols.includes(symbol);
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

test('AlertController lists alerts with response metadata', async () => {
  const alerts: PriceAlert[] = [
    {
      id: 'a1',
      userId: 'user-1',
      symbol: 'EUR/USD',
      targetPrice: 1.2,
      direction: 'above',
      createdAt: 1000,
    },
  ];
  const controller = new AlertController(
    new AlertServiceStub(alerts) as never,
    new MarketDataServiceStub(),
  );
  const res = createResponseMock();

  await controller.listAlerts(
    { authUser: { id: 'user-1' } } as AuthenticatedRequest,
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    version: 'v1',
    data: alerts,
    meta: { count: 1 },
  });
});

test('AlertController validates create payload fields', async () => {
  const controller = new AlertController(
    new AlertServiceStub() as never,
    new MarketDataServiceStub(),
  );

  const invalidRequests: Array<{
    body: Record<string, unknown>;
    code: string;
    message: string;
  }> = [
    {
      body: { symbol: 'BAD', targetPrice: 1.2, direction: 'above' },
      code: 'INVALID_SYMBOL',
      message: 'A valid symbol is required.',
    },
    {
      body: { symbol: 'EUR/USD', targetPrice: 0, direction: 'above' },
      code: 'INVALID_TARGET_PRICE',
      message: 'A valid target price is required.',
    },
    {
      body: { symbol: 'EUR/USD', targetPrice: 1.2, direction: 'sideways' },
      code: 'INVALID_DIRECTION',
      message: 'Direction must be either above or below.',
    },
  ];

  for (const invalidRequest of invalidRequests) {
    const res = createResponseMock();
    await controller.createAlert(
      {
        authUser: { id: 'user-1' },
        body: invalidRequest.body,
      } as AuthenticatedRequest,
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      version: 'v1',
      error: {
        code: invalidRequest.code,
        message: invalidRequest.message,
      },
    });
  }
});

test('AlertController creates alerts for the authenticated user', async () => {
  const createdAlert: PriceAlert = {
    id: 'a1',
    userId: 'user-1',
    symbol: 'EUR/USD',
    targetPrice: 1.25,
    direction: 'above',
    createdAt: 1000,
  };
  const alertService = new AlertServiceStub([], createdAlert);
  const controller = new AlertController(
    alertService as never,
    new MarketDataServiceStub(),
  );
  const res = createResponseMock();

  await controller.createAlert(
    {
      authUser: { id: 'user-1' },
      body: { symbol: 'EUR/USD', targetPrice: 1.25, direction: 'above' },
    } as AuthenticatedRequest,
    res,
  );

  assert.deepEqual(alertService.createdInputs, [
    {
      userId: 'user-1',
      symbol: 'EUR/USD',
      targetPrice: 1.25,
      direction: 'above',
    },
  ]);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    version: 'v1',
    data: createdAlert,
  });
});

test('AlertController normalizes ticker symbols before creating alerts', async () => {
  const createdAlert: PriceAlert = {
    id: 'a2',
    userId: 'user-1',
    symbol: 'EUR/USD',
    targetPrice: 1.22,
    direction: 'below',
    createdAt: 1001,
  };
  const alertService = new AlertServiceStub([], createdAlert);
  const controller = new AlertController(
    alertService as never,
    new MarketDataServiceStub(),
  );
  const res = createResponseMock();

  await controller.createAlert(
    {
      authUser: { id: 'user-1' },
      body: { symbol: ' eur/usd ', targetPrice: 1.22, direction: 'below' },
    } as AuthenticatedRequest,
    res,
  );

  assert.deepEqual(alertService.createdInputs, [
    {
      userId: 'user-1',
      symbol: 'EUR/USD',
      targetPrice: 1.22,
      direction: 'below',
    },
  ]);
  assert.equal(res.statusCode, 201);
});

test('AlertController validates and deletes alerts', async () => {
  const alertService = new AlertServiceStub([], undefined, false);
  const controller = new AlertController(
    alertService as never,
    new MarketDataServiceStub(),
  );

  const invalidRes = createResponseMock();
  await controller.deleteAlert(
    {
      authUser: { id: 'user-1' },
      params: { alertId: '' },
    } as unknown as AuthenticatedRequest,
    invalidRes,
  );
  assert.equal(invalidRes.statusCode, 400);

  const missingRes = createResponseMock();
  await controller.deleteAlert(
    {
      authUser: { id: 'user-1' },
      params: { alertId: 'missing' },
    } as unknown as AuthenticatedRequest,
    missingRes,
  );
  assert.equal(missingRes.statusCode, 404);

  const successService = new AlertServiceStub([], undefined, true);
  const successController = new AlertController(
    successService as never,
    new MarketDataServiceStub(),
  );
  const successRes = createResponseMock();
  await successController.deleteAlert(
    {
      authUser: { id: 'user-1' },
      params: { alertId: 'a1' },
    } as unknown as AuthenticatedRequest,
    successRes,
  );

  assert.deepEqual(successService.deletedInputs, [
    { userId: 'user-1', alertId: 'a1' },
  ]);
  assert.equal(successRes.statusCode, 200);
  assert.deepEqual(successRes.body, {
    version: 'v1',
    data: { id: 'a1' },
  });
});
