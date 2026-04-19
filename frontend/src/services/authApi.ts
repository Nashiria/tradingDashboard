import {
  AuthSession,
  AuthUser,
  isAuthSession,
  isAuthUser,
} from '../models/Auth';
import { apiClient, extractApiData } from './apiClient';

export const AUTH_STORAGE_KEY = 'trading-dashboard.auth-token';

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    const session = extractApiData<unknown>(response);

    if (!isAuthSession(session)) {
      throw new Error('Invalid auth session response.');
    }

    return session;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  async me(): Promise<AuthUser> {
    const response = await apiClient.get('/api/auth/me');
    const user = extractApiData<unknown>(response);

    if (!isAuthUser(user)) {
      throw new Error('Invalid auth user response.');
    }

    return user;
  },
};
