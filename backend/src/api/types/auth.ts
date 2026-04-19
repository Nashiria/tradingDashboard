import { Request } from 'express';
import { ApiHttpError } from '../errors/ApiHttpError';

export type AuthenticatedRequest = Request & {
  authUser: NonNullable<Request['authUser']>;
};

export function assertAuthenticatedRequest(
  req: Request,
): asserts req is AuthenticatedRequest {
  if (!req.authUser) {
    throw new ApiHttpError(
      401,
      'UNAUTHENTICATED',
      'Authentication is required.',
    );
  }
}
