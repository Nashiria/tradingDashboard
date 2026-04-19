import { Request, Response } from 'express';
import { AuthService } from '../../business/services/AuthService';
import { sendError, sendSuccess } from '../contracts/apiResponse';

export class AuthController {
  constructor(private readonly authService: Pick<AuthService, 'login'>) {}

  public async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as Record<string, unknown>;

    if (typeof email !== 'string' || typeof password !== 'string') {
      sendError(
        res,
        400,
        'INVALID_CREDENTIALS',
        'Email and password are required.',
      );
      return;
    }

    const session = this.authService.login(email, password);

    if (!session) {
      sendError(
        res,
        401,
        'AUTHENTICATION_FAILED',
        'Invalid email or password.',
      );
      return;
    }

    sendSuccess(res, 200, session);
  }

  public async me(req: Request, res: Response): Promise<void> {
    if (!req.authUser) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return;
    }

    sendSuccess(res, 200, req.authUser);
  }
}
