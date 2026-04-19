import { Request, Response } from 'express';
import { AlertService } from '../../business/services/AlertService';
import { MarketDataReadPort } from '../../business/services/MarketDataService';
import { sendError, sendSuccess } from '../contracts/apiResponse';
import {
  parseAlertId,
  parseCreateAlertBody,
} from '../contracts/alertContracts';

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

    const parsedBody = parseCreateAlertBody(
      req.body,
      this.marketDataService.hasTicker.bind(this.marketDataService),
    );

    if (!parsedBody.value) {
      sendError(
        res,
        400,
        parsedBody.code ?? 'INVALID_SYMBOL',
        parsedBody.message ?? 'A valid symbol is required.',
        parsedBody.details,
      );
      return;
    }

    const alert = await this.alertService.createAlert({
      userId: req.authUser.id,
      symbol: parsedBody.value.symbol,
      targetPrice: parsedBody.value.targetPrice,
      direction: parsedBody.value.direction,
    });

    sendSuccess(res, 201, alert);
  }

  public async deleteAlert(req: Request, res: Response): Promise<void> {
    if (!req.authUser) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return;
    }

    const parsedAlertId = parseAlertId(req.params.alertId);

    if (!parsedAlertId.value) {
      sendError(
        res,
        400,
        parsedAlertId.code ?? 'INVALID_ALERT_ID',
        parsedAlertId.message ?? 'A valid alert id is required.',
      );
      return;
    }

    const deleted = await this.alertService.deleteAlert(
      req.authUser.id,
      parsedAlertId.value,
    );

    if (!deleted) {
      sendError(res, 404, 'ALERT_NOT_FOUND', 'Alert not found.');
      return;
    }

    sendSuccess(res, 200, { id: parsedAlertId.value });
  }
}
