import React, { createContext, useContext, useState, useEffect } from 'react';
import { BranchName, Role } from '../types/laundry';

export interface UserAccount {
  id: string;
  name: string;
  role: Role;
  assignedBranch: BranchName | 'All Branches';
  email: string;
  password?: string;
}

export const ACCOUNTS: UserAccount[] = [
  { id: 'usr-absa', name: 'Nokulunga', role: 'Operator', assignedBranch: 'Absa Towers', email: 'towers@laundrylab.com', password: 'Towers@2026' },
  { id: 'usr-encore', name: 'Smiso', role: 'Operator', assignedBranch: 'The Encore', email: 'encore@laundrylab.com', password: 'Encore@2026' },
  { id: 'usr-zuri', name: 'Ntombi', role: 'Operator', assignedBranch: 'Zuri', email: 'zuri@laundrylab.com', password: 'Zuri@2026' },
  { id: 'usr-nala', name: 'Nokulunga', role: 'Operator', assignedBranch: 'Nala', email: 'nala@laundrylab.com', password: 'Nala@2026' },
  { id: 'usr-georgia', name: 'Unassigned', role: 'Operator', assignedBranch: 'Georgia', email: 'georgia@laundrylab.com', password: 'Georgia@2026' },
  { id: 'usr-centurion', name: 'Unassigned', role: 'Operator', assignedBranch: 'Centurion', email: 'centurion@laundrylab.com', password: 'Centurion@2026' },
  { id: 'usr-admin', name: 'Mpho (Owner)', role: 'Owner', assignedBranch: 'All Branches', email: 'mpho@laundylab.com', password: 'Mpho@2026' },
];

export interface LoginResult {
  success: boolean;
  error?: string;
  isLocked?: boolean;
}

interface AuthContextType {
  currentUser: UserAccount | null;
  sessionToken: string | null;
  login: (email: string, password?: string) => Promise<LoginResult>;
  logout: () => void;
  forceUnlockBranch: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDeviceDescription(): string {
  const ua = navigator.userAgent;
  let device = "Browser Client";
  if (/iPad|iPhone|iPod/.test(ua)) device = "Apple iOS Device";
  else if (/Android/.test(ua)) device = "Android Device";
  else if (/Macintosh/.test(ua)) device = "macOS Workstation";
  else if (/Windows/.test(ua)) device = "Windows Counter PC";
  return device;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('laundrylab_auth_user_v4');
    return saved ? JSON.parse(saved) : null;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem('laundrylab_session_token_v4') || null;
  });

  useEffect(() => {
    if (currentUser && sessionToken) {
      localStorage.setItem('laundrylab_auth_user_v4', JSON.stringify(currentUser));
      localStorage.setItem('laundrylab_session_token_v4', sessionToken);
    } else {
      localStorage.removeItem('laundrylab_auth_user_v4');
      localStorage.removeItem('laundrylab_session_token_v4');
    }
  }, [currentUser, sessionToken]);

  // Periodic Heartbeat to maintain active session lock on this device (every 25 seconds)
  useEffect(() => {
    if (!currentUser || !sessionToken) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUser.email, sessionToken })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.valid === false) {
            alert('Your session on this device has expired or was unlocked by management.');
            setCurrentUser(null);
            setSessionToken(null);
          }
        }
      } catch (err) {
        // Network blip, will retry next tick
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [currentUser, sessionToken]);

  const login = async (email: string, password?: string): Promise<LoginResult> => {
    const cleanEmail = email.toLowerCase().trim();
    const deviceName = getDeviceDescription();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, deviceName })
      });

      if (res.status === 409) {
        const errData = await res.json();
        return {
          success: false,
          isLocked: true,
          error: errData.message || 'This account is currently active on another device.'
        };
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errData.detail || 'Invalid email or password. Please try again.'
        };
      }

      const data = await res.json();
      setCurrentUser(data.user);
      setSessionToken(data.sessionToken);
      return { success: true };
    } catch (err) {
      // Offline fallback check against static accounts if backend unreachable
      const found = ACCOUNTS.find(a => a.email.toLowerCase() === cleanEmail);
      if (found && found.password === password) {
        setCurrentUser(found);
        setSessionToken('offline-local-token');
        return { success: true };
      }
      return { success: false, error: 'Connection failed and invalid offline credentials.' };
    }
  };

  const logout = () => {
    if (currentUser && sessionToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, sessionToken })
      }).catch(() => {});
    }
    setCurrentUser(null);
    setSessionToken(null);
  };

  const forceUnlockBranch = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/admin-force-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, sessionToken, login, logout, forceUnlockBranch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
