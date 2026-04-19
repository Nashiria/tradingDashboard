import {
  AlertDirection,
  AlertTriggerEvent,
  PriceAlert,
} from '../../domain/models/Alert';
import { PriceUpdate } from '../../domain/models/Ticker';
import { IAlertRepository } from '../../domain/repositories/IAlertRepository';

export interface CreateAlertInput {
  userId: string;
  symbol: string;
  targetPrice: number;
  direction: AlertDirection;
}

export interface AlertReadPort {
  listAlerts(userId: string): Promise<PriceAlert[]>;
}

export class AlertService implements AlertReadPort {
  constructor(private readonly alertRepository: IAlertRepository) {}

  public async createAlert(input: CreateAlertInput): Promise<PriceAlert> {
    return this.alertRepository.createAlert({
      userId: input.userId,
      symbol: input.symbol,
      targetPrice: Number(input.targetPrice.toFixed(5)),
      direction: input.direction,
      createdAt: Date.now(),
    });
  }

  public async listAlerts(userId: string): Promise<PriceAlert[]> {
    const alerts = await this.alertRepository.listAlertsByUser(userId);
    return alerts.sort((left, right) => right.createdAt - left.createdAt);
  }

  public async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    return this.alertRepository.deleteAlert(userId, alertId);
  }

  public async processPriceUpdate(update: PriceUpdate): Promise<void> {
    const alerts = await this.alertRepository.getActiveAlertsBySymbol(
      update.symbol,
    );

    for (const alert of alerts) {
      const isTriggered =
        alert.direction === 'above'
          ? update.price >= alert.targetPrice
          : update.price <= alert.targetPrice;

      if (!isTriggered) {
        continue;
      }

      const triggeredAlert = await this.alertRepository.markTriggered(
        alert.id,
        update.timestamp,
      );
      if (!triggeredAlert) {
        continue;
      }

      await this.alertRepository.publishAlertTriggered({
        userId: triggeredAlert.userId,
        alert: triggeredAlert,
        price: update.price,
        timestamp: update.timestamp,
      } satisfies AlertTriggerEvent);
    }
  }
}
