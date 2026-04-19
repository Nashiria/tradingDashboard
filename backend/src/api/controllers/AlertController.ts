import { Request, Response } from 'express';
import { AlertService } from '../../business/services/AlertService';
import { MarketDataReadPort } from '../../business/services/MarketDataService';
import { AlertDirection } from '../../domain/models/Alert';
import { sendError, sendSuccess } from '../contracts/apiResponse';

const isAlertDirection = (value: unknown): value is AlertDirection =>
  value === 'above' || value === 'below';

export class AlertController {
  constructor(
    private readonly alertService: Pick<
      AlertService,
      'listAlerts' | 'createAlert' | 'deleteAlert'
    >,
    private readonly marketDataService: Pick<MarketDataReadPort, 'hasTicker'>,
  ) {}

  public async listAlerts(req: Request, res: Response): Promise<void> {
    if (!req.authUser) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return;
    }

    const alerts = await this.alertService.listAlerts(req.authUser.id);
    sendSuccess(res, 200, alerts, { count: alerts.length });
  }

  public async createAlert(req: Request, res: Response): Promise<void> {
    if (!req.authUser) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return;
    }

    const { symbol, targetPrice, direction } = req.body as Record<
      string,
      unknown
    >;

    if (
      typeof symbol !== 'string' ||
      !this.marketDataService.hasTicker(symbol)
    ) {
      sendError(res, 400, 'INVALID_SYMBOL', 'A valid symbol is required.');
      return;
    }

    if (
      typeof targetPrice !== 'number' ||
      !Number.isFinite(targetPrice) ||
      targetPrice <= 0
    ) {
      sendError(
        res,
        400,
        'INVALID_TARGET_PRICE',
        'A valid target price is required.',
      );
      return;
    }

    if (!isAlertDirection(direction)) {
      sendError(
        res,
        400,
        'INVALID_DIRECTION',
        'Direction must be either above or below.',
      );
      return;
    }

    const alert = await this.alertService.createAlert({
      userId: req.authUser.id,
      symbol,
      targetPrice,
      direction,
    });

    sendSuccess(res, 201, alert);
  }

  public async deleteAlert(req: Request, res: Response): Promise<void> {
    if (!req.authUser) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return;
    }

    const alertId = Array.isArray(req.params.alertId)
      ? req.params.alertId[0]
      : req.params.alertId;

    if (typeof alertId !== 'string' || alertId.length === 0) {
      sendError(res, 400, 'INVALID_ALERT_ID', 'A valid alert id is required.');
      return;
    }

    const deleted = await this.alertService.deleteAlert(
      req.authUser.id,
      alertId,
    );

    if (!deleted) {
      sendError(res, 404, 'ALERT_NOT_FOUND', 'Alert not found.');
      return;
    }

    sendSuccess(res, 200, { id: alertId });
  }
}
