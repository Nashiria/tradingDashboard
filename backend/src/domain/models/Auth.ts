import type { AuthUser } from '@trading-dashboard/shared';

export interface MockUserCredentials extends AuthUser {
  password: string;
}

export { isAuthSession, isAuthUser } from '@trading-dashboard/shared';

export type {
  AuthRole,
  AuthSession,
  AuthUser,
} from '@trading-dashboard/shared';
