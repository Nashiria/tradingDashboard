import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AuthUser } from '../models/Auth';
import { authApi, AUTH_STORAGE_KEY } from '../services/authApi';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => undefined,
  logout: () => undefined,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    authApi
      .me(storedToken)
      .then((nextUser) => {
        setToken(storedToken);
        setUser(nextUser);
      })
      .catch(() => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
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
        window.localStorage.setItem(AUTH_STORAGE_KEY, session.token);
        setToken(session.token);
        setUser(session.user);
      },
      logout: () => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
