import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../../business/services/AuthService';
import { sendError } from '../contracts/apiResponse';
import { parseCookies } from '../contracts/requestCookies';
import { AUTH_TOKEN_COOKIE_NAME } from '../../config/auth';

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length);
};

export const requireAuth =
  (authService: AuthService) =>
  (req: Request, res: Response, next: NextFunction) => {
    let token = getBearerToken(req.header('authorization'));

    if (!token) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies[AUTH_TOKEN_COOKIE_NAME] || null;
    }

    if (!token) {
      sendError(
        res,
        401,
        'UNAUTHENTICATED',
        'Authentication token is missing.',
      );
      return;
    }

    const authUser = authService.verifyToken(token);

    if (!authUser) {
      sendError(
        res,
        401,
        'UNAUTHENTICATED',
        'Authentication token is invalid or expired.',
      );
      return;
    }

    req.authUser = authUser;
    next();
  };
