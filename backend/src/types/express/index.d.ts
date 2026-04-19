import { AuthUser } from '../../domain/models/Auth';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export {};
