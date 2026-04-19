import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'node:net';
import { AlertController } from '../src/api/controllers/AlertController';
import { AuthController } from '../src/api/controllers/AuthController';
import {
  errorHandler,
  notFoundHandler,
} from '../src/api/middleware/errorHandler';
import { createAlertRoutes } from '../src/api/routes/alertRoutes';
import { createAuthRoutes } from '../src/api/routes/authRoutes';
import { AlertService } from '../src/business/services/AlertService';
import { AuthService } from '../src/business/services/AuthService';
import { MockUserCredentials } from '../src/domain/models/Auth';
import { PriceAlert } from '../src/domain/models/Alert';
import { IAlertRepository } from '../src/domain/repositories/IAlertRepository';

class InMemoryAlertRepository implements IAlertRepository {
  private sequence = 0;
  private readonly alerts = new Map<string, PriceAlert>();

  async createAlert(alert: Omit<PriceAlert, 'id'>): Promise<PriceAlert> {
    const created: PriceAlert = {
      ...alert,
      id: String(++this.sequence),
    };
    this.alerts.set(created.id, created);
    return created;
  }

  async listAlertsByUser(userId: string): Promise<PriceAlert[]> {
    return [...this.alerts.values()].filter((alert) => alert.userId === userId);
  }

  async getActiveAlertsBySymbol(symbol: string): Promise<PriceAlert[]> {
    return [...this.alerts.values()].filter(
      (alert) => alert.symbol === symbol && alert.triggeredAt === undefined,
    );
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const existing = this.alerts.get(alertId);
    if (!existing || existing.userId !== userId) {
      return false;
    }

    this.alerts.delete(alertId);
    return true;
  }

  async markTriggered(
    alertId: string,
    triggeredAt: number,
  ): Promise<PriceAlert | null> {
    const existing = this.alerts.get(alertId);
    if (!existing || existing.triggeredAt !== undefined) {
      return null;
    }

    const updated = { ...existing, triggeredAt };
    this.alerts.set(alertId, updated);
    return updated;
  }

  async publishAlertTriggered(): Promise<void> {}
}

const USERS: readonly MockUserCredentials[] = [
  {
    id: 'demo-trader',
    email: 'demo@mockbank.com',
    password: 'demo123',
    name: 'Demo Trader',
    role: 'demo',
  },
];

async function startServer(): Promise<{
  server: http.Server;
  baseUrl: string;
}> {
  const authService = new AuthService(USERS, 'integration-secret');
  const alertService = new AlertService(new InMemoryAlertRepository());
  const app = express();

  app.use(express.json());
  app.use(
    '/api/auth',
    createAuthRoutes(new AuthController(authService), authService),
  );
  app.use(
    '/api/alerts',
    createAlertRoutes(
      new AlertController(alertService, {
        hasTicker: (symbol: string) => symbol === 'EUR/USD',
      }),
      authService,
    ),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

test('auth and alert routes work together through the full HTTP stack', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'demo@mockbank.com', password: 'demo123' }),
    });
    assert.equal(loginResponse.status, 200);

    const loginPayload = (await loginResponse.json()) as {
      data: { token: string };
    };
    const token = loginPayload.data.token;
    assert.equal(typeof token, 'string');

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(meResponse.status, 200);

    const createResponse = await fetch(`${baseUrl}/api/alerts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        symbol: 'EUR/USD',
        targetPrice: 1.25,
        direction: 'above',
      }),
    });
    assert.equal(createResponse.status, 201);

    const createdPayload = (await createResponse.json()) as {
      data: PriceAlert;
    };

    const listResponse = await fetch(`${baseUrl}/api/alerts`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listResponse.status, 200);
    const listPayload = (await listResponse.json()) as {
      data: PriceAlert[];
      meta: { count: number };
    };
    assert.equal(listPayload.meta.count, 1);
    assert.deepEqual(listPayload.data[0], createdPayload.data);

    const deleteResponse = await fetch(
      `${baseUrl}/api/alerts/${createdPayload.data.id}`,
      {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      },
    );
    assert.equal(deleteResponse.status, 200);

    const afterDeleteResponse = await fetch(`${baseUrl}/api/alerts`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const afterDeletePayload = (await afterDeleteResponse.json()) as {
      data: PriceAlert[];
      meta: { count: number };
    };
    assert.equal(afterDeletePayload.meta.count, 0);
    assert.deepEqual(afterDeletePayload.data, []);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
