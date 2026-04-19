import test from 'node:test';
import assert from 'node:assert/strict';
import { RedisMarketDataRepository } from '../src/infrastructure/repositories/RedisMarketDataRepository';
import { redisClient } from '../src/infrastructure/redis/redisClient';
import { PriceUpdate } from '../src/domain/models/Ticker';

const repository = new RedisMarketDataRepository(redisClient);

const originalMethods = {
  exists: redisClient.exists,
  hSet: redisClient.hSet,
  hGetAll: redisClient.hGetAll,
  rPush: redisClient.rPush,
  lTrim: redisClient.lTrim,
  lRange: redisClient.lRange,
  publish: redisClient.publish,
};

function restoreRedisClient() {
  Object.assign(
    redisClient as unknown as Record<string, unknown>,
    originalMethods as unknown as Record<string, unknown>,
  );
}

test.afterEach(() => {
  restoreRedisClient();
});

test('RedisMarketDataRepository reads and writes prices through redisClient', async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  (redisClient as unknown as Record<string, unknown>).exists = async (
    ...args: unknown[]
  ) => {
    calls.push({ method: 'exists', args });
    return 1;
  };
  (redisClient as unknown as Record<string, unknown>).hSet = async (
    ...args: unknown[]
  ) => {
    calls.push({ method: 'hSet', args });
    return 1;
  };
  (redisClient as unknown as Record<string, unknown>).hGetAll = async (
    ...args: unknown[]
  ) => {
    calls.push({ method: 'hGetAll', args });
    return { 'EUR/USD': '1.09', AAPL: '182.5' };
  };

  assert.equal(await repository.hasPrices(), true);

  await repository.setPrice('EUR/USD', 1.09);

  assert.deepEqual(await repository.getAllPrices(), {
    'EUR/USD': 1.09,
    AAPL: 182.5,
  });

  assert.deepEqual(calls, [
    { method: 'exists', args: ['prices'] },
    { method: 'hSet', args: ['prices', 'EUR/USD', '1.09'] },
    { method: 'hGetAll', args: ['prices'] },
  ]);
});

test('RedisMarketDataRepository persists history, trims it, filters invalid entries, and publishes updates', async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const update: PriceUpdate = {
    symbol: 'EUR/USD',
    price: 1.09,
    timestamp: 1234,
  };
  const consoleError = console.error;

  console.error = () => undefined;
  try {
    (redisClient as unknown as Record<string, unknown>).rPush = async (
      ...args: unknown[]
    ) => {
      calls.push({ method: 'rPush', args });
      return 1;
    };
    (redisClient as unknown as Record<string, unknown>).lTrim = async (
      ...args: unknown[]
    ) => {
      calls.push({ method: 'lTrim', args });
      return 'OK';
    };
    (redisClient as unknown as Record<string, unknown>).lRange = async (
      ...args: unknown[]
    ) => {
      calls.push({ method: 'lRange', args });
      return [JSON.stringify(update), '{"invalid":true}', 'not-json'];
    };
    (redisClient as unknown as Record<string, unknown>).publish = async (
      ...args: unknown[]
    ) => {
      calls.push({ method: 'publish', args });
      return 1;
    };

    await repository.saveHistory('EUR/USD', [update]);
    assert.deepEqual(await repository.getHistory('EUR/USD'), [update]);

    await repository.publishPriceUpdate(update);

    assert.deepEqual(calls, [
      {
        method: 'rPush',
        args: ['history:EUR/USD', [JSON.stringify(update)]],
      },
      {
        method: 'lTrim',
        args: ['history:EUR/USD', -600, -1],
      },
      {
        method: 'lRange',
        args: ['history:EUR/USD', 0, -1],
      },
      {
        method: 'publish',
        args: ['priceUpdate', JSON.stringify(update)],
      },
    ]);
  } finally {
    console.error = consoleError;
  }
});
