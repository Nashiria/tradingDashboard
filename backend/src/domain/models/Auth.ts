export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'demo' | 'trader' | 'admin';
}

export interface MockUserCredentials extends AuthUser {
  password: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}
