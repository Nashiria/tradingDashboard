import { Request, Response } from 'express';
import { AuthService } from '../../business/services/AuthService';
import { sendError, sendSuccess } from '../contracts/apiResponse';
import { parseLoginRequest } from '../contracts/authContracts';
import { AUTH_TOKEN_COOKIE_NAME, AUTH_TOKEN_TTL_MS } from '../../config/auth';

export class AuthController {
  constructor(private readonly authService: Pick<AuthService, 'login'>) {}

  public async login(req: Request, res: Response): Promise<void> {
    const parsedLogin = parseLoginRequest(req.body);

    if (!parsedLogin.value) {
      sendError(
        res,
        400,
        'INVALID_CREDENTIALS',
        'Email and password are required.',
        parsedLogin.errors,
      );
      return;
    }

    const session = this.authService.login(
      parsedLogin.value.email,
      parsedLogin.value.password,
    );

    if (!session) {
      sendError(
        res,
        401,
        'AUTHENTICATION_FAILED',
        'Invalid email or password.',
      );
      return;
    }

    res.cookie(AUTH_TOKEN_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.min(
        Math.max(session.expiresAt - Date.now(), 0),
        AUTH_TOKEN_TTL_MS,
      ),
    });

    sendSuccess(res, 200, session);
  }

  public async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie(AUTH_TOKEN_COOKIE_NAME, {
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
