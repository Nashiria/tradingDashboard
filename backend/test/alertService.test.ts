import assert from 'node:assert/strict';
import test from 'node:test';
import { AlertService } from '../src/business/services/AlertService';
import { AlertTriggerEvent, PriceAlert } from '../src/domain/models/Alert';
import { PriceUpdate } from '../src/domain/models/Ticker';
import { IAlertRepository } from '../src/domain/repositories/IAlertRepository';

class InMemoryAlertRepository implements IAlertRepository {
  public createdAlerts: Array<Omit<PriceAlert, 'id'>> = [];
  public deletedCalls: Array<{ userId: string; alertId: string }> = [];
  public publishedEvents: AlertTriggerEvent[] = [];
  public markTriggeredCalls: Array<{ alertId: string; triggeredAt: number }> =
    [];

  constructor(
    private readonly alertsByUser: Record<string, PriceAlert[]> = {},
    private readonly activeAlertsBySymbol: Record<string, PriceAlert[]> = {},
    private readonly markTriggeredResults: Record<
      string,
      PriceAlert | null
    > = {},
    private readonly deleteResult = true,
  ) {}

  async createAlert(alert: Omit<PriceAlert, 'id'>): Promise<PriceAlert> {
    this.createdAlerts.push(alert);
    return { ...alert, id: 'alert-1' };
  }

  async listAlertsByUser(userId: string): Promise<PriceAlert[]> {
    return this.alertsByUser[userId] ?? [];
  }

  async getActiveAlertsBySymbol(symbol: string): Promise<PriceAlert[]> {
    return this.activeAlertsBySymbol[symbol] ?? [];
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    this.deletedCalls.push({ userId, alertId });
    return this.deleteResult;
  }

  async markTriggered(
    alertId: string,
    triggeredAt: number,
  ): Promise<PriceAlert | null> {
    this.markTriggeredCalls.push({ alertId, triggeredAt });
    return this.markTriggeredResults[alertId] ?? null;
  }

  async publishAlertTriggered(event: AlertTriggerEvent): Promise<void> {
    this.publishedEvents.push(event);
  }
}

test('AlertService creates alerts with rounded prices and timestamps', async () => {
  const repository = new InMemoryAlertRepository();
  const service = new AlertService(repository);
  const originalNow = Date.now;

  try {
    Date.now = () => 123_456;

    const alert = await service.createAlert({
      userId: 'user-1',
      symbol: 'EUR/USD',
      targetPrice: 1.234567,
      direction: 'above',
    });

    assert.deepEqual(repository.createdAlerts[0], {
      userId: 'user-1',
      symbol: 'EUR/USD',
      targetPrice: 1.23457,
      direction: 'above',
      createdAt: 123_456,
    });
    assert.equal(alert.id, 'alert-1');
  } finally {
    Date.now = originalNow;
  }
});

test('AlertService lists alerts newest first', async () => {
  const repository = new InMemoryAlertRepository({
    'user-1': [
      {
        id: 'older',
        userId: 'user-1',
        symbol: 'EUR/USD',
        targetPrice: 1.1,
        direction: 'above',
        createdAt: 1000,
      },
      {
        id: 'newer',
        userId: 'user-1',
        symbol: 'AAPL',
        targetPrice: 200,
        direction: 'below',
        createdAt: 2000,
      },
    ],
  });
  const service = new AlertService(repository);

  const alerts = await service.listAlerts('user-1');

  assert.deepEqual(
    alerts.map((alert) => alert.id),
    ['newer', 'older'],
  );
});

test('AlertService forwards delete requests to the repository', async () => {
  const repository = new InMemoryAlertRepository({}, {}, {}, false);
  const service = new AlertService(repository);

  const deleted = await service.deleteAlert('user-1', 'alert-9');

  assert.equal(deleted, false);
  assert.deepEqual(repository.deletedCalls, [
    { userId: 'user-1', alertId: 'alert-9' },
  ]);
});

test('AlertService triggers matching alerts and publishes events once marked', async () => {
  const activeAlert: PriceAlert = {
    id: 'alert-1',
    userId: 'user-1',
    symbol: 'EUR/USD',
    targetPrice: 1.2,
    direction: 'above',
    createdAt: 1000,
  };
  const repository = new InMemoryAlertRepository(
    {},
    { 'EUR/USD': [activeAlert] },
    { 'alert-1': { ...activeAlert, triggeredAt: 9999 } },
  );
  const service = new AlertService(repository);
  const update: PriceUpdate = {
    symbol: 'EUR/USD',
    price: 1.25,
    timestamp: 9999,
  };

  await service.processPriceUpdate(update);

  assert.deepEqual(repository.markTriggeredCalls, [
    { alertId: 'alert-1', triggeredAt: 9999 },
  ]);
  assert.deepEqual(repository.publishedEvents, [
    {
      userId: 'user-1',
      alert: { ...activeAlert, triggeredAt: 9999 },
      price: 1.25,
      timestamp: 9999,
    },
  ]);
});

test('AlertService ignores non-triggering and already-handled alerts', async () => {
  const belowAlert: PriceAlert = {
    id: 'alert-1',
    userId: 'user-1',
    symbol: 'AAPL',
    targetPrice: 150,
    direction: 'below',
    createdAt: 1000,
  };
  const aboveAlert: PriceAlert = {
    id: 'alert-2',
    userId: 'user-2',
    symbol: 'AAPL',
    targetPrice: 190,
    direction: 'above',
    createdAt: 1000,
  };
  const repository = new InMemoryAlertRepository(
    {},
    { AAPL: [belowAlert, aboveAlert] },
    { 'alert-1': null },
  );
  const service = new AlertService(repository);

  await service.processPriceUpdate({
    symbol: 'AAPL',
    price: 149,
    timestamp: 3000,
  });

  assert.deepEqual(repository.markTriggeredCalls, [
    { alertId: 'alert-1', triggeredAt: 3000 },
  ]);
  assert.deepEqual(repository.publishedEvents, []);
});
