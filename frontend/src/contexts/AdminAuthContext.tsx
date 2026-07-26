import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ADMIN_UNAUTHORIZED_EVENT,
  getAdminToken,
  setAdminToken,
} from '../lib/admin-token';
import type { User } from '../types';

const SESSION_KEY = 'ay-food-admin-session';

/** Non-secret default email hint for the login form only. */
const ADMIN_EMAIL_HINT = (
  import.meta.env.VITE_ADMIN_EMAIL as string | undefined
)?.trim()
  .toLowerCase() || 'contact@ayfoodpalace.com';

type AdminSession = {
  user: User;
};

interface AdminAuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function readSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

function writeSession(session: AdminSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    void import('../lib/admin-rpc').then(({ adminLogout }) => adminLogout());
    writeSession(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  useEffect(() => {
    const session = readSession();
    const token = getAdminToken();
    if (session?.user && token) {
      setUser(session.user);
      void import('../services/site-visit.service').then(({ siteVisitService }) => {
        void siteVisitService.purgeCurrentVisitorSession();
      });
    } else {
      writeSession(null);
      setAdminToken(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      writeSession(null);
      setAdminToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { adminLogin } = await import('../lib/admin-rpc');
    const { email: loggedEmail } = await adminLogin(email, password);
    const adminUser: User = {
      id: 'db-admin',
      email: loggedEmail,
      firstName: 'Ay Food',
      lastName: 'Admin',
      role: 'OWNER',
    };
    writeSession({ user: adminUser });
    setUser(adminUser);
    void import('../services/site-visit.service').then(({ siteVisitService }) => {
      void siteVisitService.purgeCurrentVisitorSession();
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: !!user && user.role === 'OWNER',
      login,
      logout,
    }),
    [user, loading, login, logout]
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export const ADMIN_DEMO_CREDENTIALS = {
  email: ADMIN_EMAIL_HINT,
} as const;
