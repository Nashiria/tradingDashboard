import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AuthUser } from '../models/Auth';
import { authApi } from '../services/authApi';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null, // Keep it for compatibility if something else needs it, though it will just be a dummy
  isLoading: true,
  login: async () => undefined,
  logout: async () => undefined,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Rely on httpOnly cookie now. Try fetching /me
    authApi
      .me()
      .then((nextUser) => {
        setToken('cookie-auth'); // dummy token to satisfy token checks
        setUser(nextUser);
      })
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      login: async (email: string, password: string) => {
        const session = await authApi.login(email, password);
        setToken(session.token || 'cookie-auth');
        setUser(session.user);
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch (e) {
          console.error('Logout failed', e);
        }
        setToken(null);
        setUser(null);
      },
    }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
