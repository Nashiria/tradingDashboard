import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../../business/services/AuthService';
import { sendError } from '../contracts/apiResponse';

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length);
};

export const parseCookies = (cookieHeader?: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      cookies[key.trim()] = value.trim();
    }
  }
  return cookies;
};

export const requireAuth =
  (authService: AuthService) =>
  (req: Request, res: Response, next: NextFunction) => {
    let token = getBearerToken(req.header('authorization'));

    if (!token) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies['auth_token'] || null;
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
