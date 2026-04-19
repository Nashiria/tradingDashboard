import {
  AlertTriggerEvent,
  PriceAlert,
  AlertDirection,
} from '../../domain/models/Alert';
import { IAlertRepository } from '../../domain/repositories/IAlertRepository';
import { PrismaClient } from '@prisma/client';
import { redisClient } from '../redis/redisClient';

const prisma = new PrismaClient();

export class PrismaAlertRepository implements IAlertRepository {
  async createAlert(alert: Omit<PriceAlert, 'id'>): Promise<PriceAlert> {
    const created = await prisma.alert.create({
      data: {
        userId: alert.userId,
        symbol: alert.symbol,
        targetPrice: alert.targetPrice,
        direction: alert.direction,
        createdAt: alert.createdAt,
      },
    });
    return {
      ...created,
      direction: created.direction as AlertDirection,
      triggeredAt: created.triggeredAt || undefined,
    };
  }

  async listAlertsByUser(userId: string): Promise<PriceAlert[]> {
    const alerts = await prisma.alert.findMany({ where: { userId } });
    return alerts.map((a) => ({
      ...a,
      direction: a.direction as AlertDirection,
      triggeredAt: a.triggeredAt || undefined,
    }));
  }

  async getActiveAlertsBySymbol(symbol: string): Promise<PriceAlert[]> {
    const alerts = await prisma.alert.findMany({
      where: { symbol, triggeredAt: null },
    });
    return alerts.map((a) => ({
      ...a,
      direction: a.direction as AlertDirection,
      triggeredAt: a.triggeredAt || undefined,
    }));
  }

  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    try {
      const result = await prisma.alert.deleteMany({
        where: { id: alertId, userId },
      });
      return result.count > 0;
    } catch {
      return false;
    }
  }

  async markTriggered(
    alertId: string,
    triggeredAt: number,
  ): Promise<PriceAlert | null> {
    try {
      const updated = await prisma.alert.update({
        where: { id: alertId },
        data: { triggeredAt },
      });
      return {
        ...updated,
        direction: updated.direction as AlertDirection,
        triggeredAt: updated.triggeredAt || undefined,
      };
    } catch {
      return null;
    }
  }

  async publishAlertTriggered(event: AlertTriggerEvent): Promise<void> {
    await redisClient.publish('alertTriggered', JSON.stringify(event));
  }
}
