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

    res.cookie('auth_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendSuccess(res, 200, session);
  }

  public async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    sendSuccess(res, 200, { success: true });
  }

  public async me(req: Request, res: Response): Promise<void> {
    if (!req.authUser) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return;
    }

    sendSuccess(res, 200, req.authUser);
  }
}
