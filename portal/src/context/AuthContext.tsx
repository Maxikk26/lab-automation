import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, WorkflowConfig } from '../types';
import { login as apiLogin, fetchAutomatizaciones } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  workflows: WorkflowConfig[];
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  refreshWorkflows: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setWorkflows([]);
  }, []);

  const loadWorkflows = useCallback(async () => {
    try {
      const res = await fetchAutomatizaciones();
      if (res.success) {
        setWorkflows(res.data);
      }
    } catch {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      if (!isTokenExpired(savedToken)) {
        setToken(savedToken);
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          clearSession();
        }
      } else {
        clearSession();
      }
    }
    setLoading(false);
  }, [clearSession]);

  useEffect(() => {
    if (token) {
      loadWorkflows();
    }
  }, [token, loadWorkflows]);

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      const res = await apiLogin(username, password);
      if (res.success) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        return null;
      }
      return res.message || 'Error de autenticacion';
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        workflows,
        loading,
        login,
        logout: clearSession,
        refreshWorkflows: loadWorkflows,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
