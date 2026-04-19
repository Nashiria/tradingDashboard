import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, Server } from 'node:http';
import { once } from 'node:events';
import WebSocket from 'ws';
import { SocketManager } from '../src/api/websockets/SocketManager';
import { PriceUpdate, TickerWithPrice } from '../src/domain/models/Ticker';

type SubscriberCallback = (message: string) => void;

class FakePriceUpdateSubscriber {
  public listeners = new Map<string, SubscriberCallback>();

  subscribe(channel: string, listener: SubscriberCallback) {
    this.listeners.set(channel, listener);
  }

  emit(channel: string, message: string) {
    this.listeners.get(channel)?.(message);
  }
}

const sampleTicker: TickerWithPrice = {
  symbol: 'EUR/USD',
  name: 'Euro / US Dollar',
  basePrice: 1.085,
  currentPrice: 1.091,
  type: 'Forex',
  isFavorite: true,
  inPortfolio: true,
  icon: 'eur|usd',
};

async function startServer(server: Server): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine test server port');
  }

  return address.port;
}

async function waitForJsonMessage<T>(socket: WebSocket): Promise<T> {
  const [raw] = await once(socket, 'message');
  const payload = typeof raw === 'string' ? raw : raw.toString();
  return JSON.parse(payload) as T;
}

test('SocketManager sends initial data, replays buffered updates on subscribe, and broadcasts only to subscribed clients', async () => {
  const server = createServer();
  const subscriber = new FakePriceUpdateSubscriber();
  const socketManager = new SocketManager(
    server,
    {
      getTickers: async () => [sampleTicker],
      hasTicker: (symbol: string) => symbol === sampleTicker.symbol,
    },
    subscriber,
  );
  socketManager.start();

  const port = await startServer(server);
  const client = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const initialMessagePromise = waitForJsonMessage<{
    type: string;
    data: (typeof sampleTicker)[];
  }>(client);

  try {
    await once(client, 'open');

    assert.deepEqual(Array.from(subscriber.listeners.keys()).sort(), [
      'alertTriggered',
      'priceUpdate',
    ]);

    const initial = await initialMessagePromise;
    assert.deepEqual(initial, {
      type: 'INITIAL_TICKERS',
      data: [sampleTicker],
    });

    const pongPromise = waitForJsonMessage<{ type: string }>(client);
    client.send(JSON.stringify({ type: 'PING' }));
    const pong = await pongPromise;
    assert.deepEqual(pong, { type: 'PONG' });

    const bufferedUpdate: PriceUpdate = {
      symbol: 'EUR/USD',
      price: 1.094,
      timestamp: 4000,
    };
    subscriber.emit('priceUpdate', JSON.stringify(bufferedUpdate));

    const replayedUpdatePromise = waitForJsonMessage<{
      type: string;
      data: PriceUpdate;
    }>(client);
    client.send(JSON.stringify({ type: 'SUBSCRIBE', ticker: 'EUR/USD' }));
    const replayedUpdate = await replayedUpdatePromise;

    assert.deepEqual(replayedUpdate, {
      type: 'PRICE_UPDATE',
      data: bufferedUpdate,
    });

    const liveUpdate: PriceUpdate = {
      symbol: 'EUR/USD',
      price: 1.095,
      timestamp: 5000,
    };
    const priceUpdatePromise = waitForJsonMessage<{
      type: string;
      data: PriceUpdate;
    }>(client);
    subscriber.emit('priceUpdate', JSON.stringify(liveUpdate));

    const priceUpdate = await priceUpdatePromise;
    assert.deepEqual(priceUpdate, {
      type: 'PRICE_UPDATE',
      data: liveUpdate,
    });

    client.send(JSON.stringify({ type: 'UNSUBSCRIBE', ticker: 'EUR/USD' }));
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    subscriber.emit(
      'priceUpdate',
      JSON.stringify({ symbol: 'EUR/USD', price: 1.096, timestamp: 6000 }),
    );

    let receivedUnexpectedMessage = false;
    const handleUnexpectedMessage = () => {
      receivedUnexpectedMessage = true;
    };

    client.once('message', handleUnexpectedMessage);
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    client.off('message', handleUnexpectedMessage);

    assert.equal(receivedUnexpectedMessage, false);
  } finally {
    client.terminate();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => {
      (
        socketManager as unknown as {
          wss: { close: (callback: () => void) => void };
        }
      ).wss.close(() => resolve());
    });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
