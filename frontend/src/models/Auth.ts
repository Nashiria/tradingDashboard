export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'demo' | 'trader' | 'admin';
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isAuthUser = (value: unknown): value is AuthUser =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.email === 'string' &&
  typeof value.name === 'string' &&
  (value.role === 'demo' || value.role === 'trader' || value.role === 'admin');

export const isAuthSession = (value: unknown): value is AuthSession =>
  isRecord(value) &&
  typeof value.token === 'string' &&
  typeof value.expiresAt === 'number' &&
  isAuthUser(value.user);
