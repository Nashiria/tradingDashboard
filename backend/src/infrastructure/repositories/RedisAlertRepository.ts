import { AlertTriggerEvent, PriceAlert } from '../../domain/models/Alert';
import { IAlertRepository } from '../../domain/repositories/IAlertRepository';
import { redisClient } from '../redis/redisClient';

const ALERT_SEQUENCE_KEY = 'alerts:sequence';

const alertKey = (alertId: string) => `alert:${alertId}`;
const userAlertsKey = (userId: string) => `user-alerts:${userId}`;
const symbolAlertsKey = (symbol: string) => `symbol-alerts:${symbol}`;

const serializeAlert = (alert: PriceAlert): Record<string, string> => ({
  id: alert.id,
  userId: alert.userId,
  symbol: alert.symbol,
  targetPrice: alert.targetPrice.toString(),
  direction: alert.direction,
  createdAt: alert.createdAt.toString(),
  ...(alert.triggeredAt === undefined
    ? {}
    : { triggeredAt: alert.triggeredAt.toString() }),
});

const deserializeAlert = (value: Record<string, string>): PriceAlert | null => {
  if (
    !value.id ||
    !value.userId ||
    !value.symbol ||
    !value.targetPrice ||
    !value.direction ||
    !value.createdAt
  ) {
    return null;
  }

  return {
    id: value.id,
    userId: value.userId,
    symbol: value.symbol,
    targetPrice: Number(value.targetPrice),
    direction: value.direction === 'above' ? 'above' : 'below',
    createdAt: Number(value.createdAt),
    ...(value.triggeredAt ? { triggeredAt: Number(value.triggeredAt) } : {}),
  };
};

export class RedisAlertRepository implements IAlertRepository {
  public async createAlert(alert: Omit<PriceAlert, 'id'>): Promise<PriceAlert> {
    const alertId = String(await redisClient.incr(ALERT_SEQUENCE_KEY));
    const storedAlert: PriceAlert = {
      ...alert,
      id: alertId,
    };

    await redisClient.hSet(alertKey(alertId), serializeAlert(storedAlert));
    await redisClient.sAdd(userAlertsKey(storedAlert.userId), alertId);
    await redisClient.sAdd(symbolAlertsKey(storedAlert.symbol), alertId);

    return storedAlert;
  }

  public async listAlertsByUser(userId: string): Promise<PriceAlert[]> {
    const alertIds = await redisClient.sMembers(userAlertsKey(userId));
    const results = await Promise.all(
      alertIds.map(async (alertId) =>
        deserializeAlert(await redisClient.hGetAll(alertKey(alertId))),
      ),
    );
    return results.filter((alert): alert is PriceAlert => alert !== null);
  }

  public async getActiveAlertsBySymbol(symbol: string): Promise<PriceAlert[]> {
    const alertIds = await redisClient.sMembers(symbolAlertsKey(symbol));
    const results = await Promise.all(
      alertIds.map(async (alertId) =>
        deserializeAlert(await redisClient.hGetAll(alertKey(alertId))),
      ),
    );
    return results.filter(
      (alert): alert is PriceAlert =>
        alert !== null && alert.triggeredAt === undefined,
    );
  }

  public async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const existing = deserializeAlert(
      await redisClient.hGetAll(alertKey(alertId)),
    );

    if (!existing || existing.userId !== userId) {
      return false;
    }

    await redisClient.del(alertKey(alertId));
    await redisClient.sRem(userAlertsKey(existing.userId), alertId);
    await redisClient.sRem(symbolAlertsKey(existing.symbol), alertId);

    return true;
  }

  public async markTriggered(
    alertId: string,
    triggeredAt: number,
  ): Promise<PriceAlert | null> {
    const existing = deserializeAlert(
      await redisClient.hGetAll(alertKey(alertId)),
    );

    if (!existing || existing.triggeredAt !== undefined) {
      return null;
    }

    const updated: PriceAlert = {
      ...existing,
      triggeredAt,
    };

    await redisClient.hSet(alertKey(alertId), serializeAlert(updated));
    return updated;
  }

  public async publishAlertTriggered(event: AlertTriggerEvent): Promise<void> {
    await redisClient.publish('alertTriggered', JSON.stringify(event));
  }
}
