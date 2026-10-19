import { isAxiosError } from 'axios';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';


import type { AuthContextValue, UserOut } from '@src/features/auth/core/types';
import {
  getMeRequest,
  loginRequest,
  logoutRequest,
  refreshTokenRequest,
  registerRequest,
} from '@src/features/auth/services/authApi';
import { api } from '@src/lib/api/axios';

export type { AuthContextValue } from '@src/features/auth/core/types';

import type { InternalAxiosRequestConfig } from 'axios';
import type { ReactNode } from 'react';



/**
 * AuthProvider – stellt den Auth-Context für die gesamte App bereit.
 *
 * Beim Mount wird `getMeRequest()` aufgerufen um den aktuellen User zu laden.
 * Ein 401-Interceptor versucht bei abgelaufenem Access-Token automatisch den
 * Refresh-Token einzusetzen (POST /auth/refresh). Erst wenn der Refresh
 * ebenfalls fehlschlägt, wird der User ausgeloggt.
 */
interface AuthProviderProps {
  children: ReactNode
}

/** Axios-Config-Erweiterung für Retry-Flag. */
interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

// ── Module-Level State ──────────────────────────────────────────

let interceptorRegistered = false;

const isRefreshing = { current: false };

/** @internal – nur für `useAuth` exportiert */
let logoutHandler: (() => Promise<void>) | null = null;

// ── Functions ───────────────────────────────────────────────────

/** Props für den AuthProvider. */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Cookie ggf. schon abgelaufen – ignorieren
    } finally {
      setUser(null);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const userData = await getMeRequest();
      setUser(userData);
    } catch {
      setUser(null);
    }
  }, []);

  // logoutHandler für den module-level Interceptor aktuell halten
  useEffect(() => {
    logoutHandler = logout;
    return () => {
      logoutHandler = null;
    };
  }, [logout]);

  // Beim Mount: Session wiederherstellen
  // Wenn access_token abgelaufen (401) → refresh_token einsetzen → nochmal versuchen
  useEffect(() => {
    const initSession = async () => {
      try {
        const userData = await getMeRequest();
        setUser(userData);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 401) {
          try {
            await refreshTokenRequest();
            const userData = await getMeRequest();
            setUser(userData);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void initSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserOut> => {
    const response = await loginRequest(email, password);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      await registerRequest(email, name, password);
      // Kein auto-login – User muss E-Mail bestätigen (Phase 2i)
    },
    [],
  );

  const value = useMemo(
    () => ({ user, isLoading, login, logout, register, fetchUser }),
    [user, isLoading, login, logout, register, fetchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 401-Interceptor – module-level registriert, damit StrictMode ihn nicht
 * doppelt mountet/unmountet. Sonst gibt es eine Lücke, in der API-Calls
 * von Child-Componenten (nach isLoading=false) ungefiltert 401 erhalten.
 *
 * Wird beim ersten Import aktiviert und bleibt für die gesamte App-Lifetime.
 */
function registerInterceptor() {
  if (interceptorRegistered) return;
  interceptorRegistered = true;

  api.interceptors.response.use(
    (response) => response,
    async (error: { config: RetryConfig; response?: { status: number } }) => {
      const url = error.config?.url ?? '';
      const isAuthEndpoint =
        url.includes('/user/auth/refresh') ||
        url.includes('/public/auth/login') ||
        url.includes('/user/auth/me');

      if (
        error.response?.status === 401 &&
        !isAuthEndpoint &&
        !(error.config as unknown as Record<string, unknown>)['_retried'] &&
        !isRefreshing.current
      ) {
        isRefreshing.current = true;
        (error.config as unknown as Record<string, unknown>)['_retried'] = true;

        try {
          await refreshTokenRequest();
          return api.request(error.config);
        } catch {
          await logoutHandler?.();
        } finally {
          isRefreshing.current = false;
        }
      }

      return Promise.reject(error);
    },
  );
}

registerInterceptor();

export { AuthContext };
const AuthContext = createContext<AuthContextValue | null>(null);
