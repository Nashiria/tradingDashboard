import { AlertTriggerEvent, PriceAlert } from '../../domain/models/Alert';
import { IAlertRepository } from '../../domain/repositories/IAlertRepository';
import { type createClient } from 'redis';

type RedisClientType = ReturnType<typeof createClient>;

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
  private readonly redisClient: RedisClientType;

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
  }

  public async createAlert(alert: Omit<PriceAlert, 'id'>): Promise<PriceAlert> {
    const alertId = String(await this.redisClient.incr(ALERT_SEQUENCE_KEY));
    const storedAlert: PriceAlert = {
      ...alert,
      id: alertId,
    };

    await this.redisClient.hSet(alertKey(alertId), serializeAlert(storedAlert));
    await this.redisClient.sAdd(userAlertsKey(storedAlert.userId), alertId);
    await this.redisClient.sAdd(symbolAlertsKey(storedAlert.symbol), alertId);

    return storedAlert;
  }

  public async listAlertsByUser(userId: string): Promise<PriceAlert[]> {
    const alertIds = await this.redisClient.sMembers(userAlertsKey(userId));
    const results = await Promise.all(
      alertIds.map(async (alertId) =>
        deserializeAlert(await this.redisClient.hGetAll(alertKey(alertId))),
      ),
    );
    return results.filter((alert): alert is PriceAlert => alert !== null);
  }

  public async getActiveAlertsBySymbol(symbol: string): Promise<PriceAlert[]> {
    const alertIds = await this.redisClient.sMembers(symbolAlertsKey(symbol));
    const results = await Promise.all(
      alertIds.map(async (alertId) =>
        deserializeAlert(await this.redisClient.hGetAll(alertKey(alertId))),
      ),
    );
    return results.filter(
      (alert): alert is PriceAlert =>
        alert !== null && alert.triggeredAt === undefined,
    );
  }

  public async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const existing = deserializeAlert(
      await this.redisClient.hGetAll(alertKey(alertId)),
    );

    if (!existing || existing.userId !== userId) {
      return false;
    }

    await this.redisClient.del(alertKey(alertId));
    await this.redisClient.sRem(userAlertsKey(existing.userId), alertId);
    await this.redisClient.sRem(symbolAlertsKey(existing.symbol), alertId);

    return true;
  }

  public async markTriggered(
    alertId: string,
    triggeredAt: number,
  ): Promise<PriceAlert | null> {
    const existing = deserializeAlert(
      await this.redisClient.hGetAll(alertKey(alertId)),
    );

    if (!existing || existing.triggeredAt !== undefined) {
      return null;
    }

    const updated: PriceAlert = {
      ...existing,
      triggeredAt,
    };

    await this.redisClient.hSet(alertKey(alertId), serializeAlert(updated));
    return updated;
  }

  public async publishAlertTriggered(event: AlertTriggerEvent): Promise<void> {
    await this.redisClient.publish('alertTriggered', JSON.stringify(event));
  }
}
