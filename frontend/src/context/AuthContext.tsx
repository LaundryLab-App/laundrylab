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
  { id: 'usr-absa', name: 'Clyde', role: 'Operator', assignedBranch: 'Absa Towers', email: 'clyde@laundylab.com', password: 'clyde123' },
  { id: 'usr-zuri', name: 'Nkateko', role: 'Operator', assignedBranch: 'Zuri', email: 'nkateko@laundrylab.com', password: 'nkateko123' },
  { id: 'usr-nala', name: 'Skhathi', role: 'Operator', assignedBranch: 'Nala', email: 'skhathi@laundrylab.com', password: 'skhathi123' },
  { id: 'usr-encore', name: 'Mpho', role: 'Operator', assignedBranch: 'The Encore', email: 'mpho@laundylab.com', password: 'mpho123' },
  { id: 'usr-georgia', name: 'Pops', role: 'Operator', assignedBranch: 'Georgia', email: 'pops@laundrylab.com', password: 'pops123' },
  { id: 'usr-centurion', name: 'Kairo', role: 'Operator', assignedBranch: 'Centurion', email: 'kairo@laundrylab.com', password: 'kairo123' },
  { id: 'usr-admin', name: 'Popela (Owner)', role: 'Owner', assignedBranch: 'All Branches', email: 'popela@laundrylab.com', password: 'popela123' },
];

interface AuthContextType {
  currentUser: UserAccount | null;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('laundrylab_auth_user_v3');
    return saved ? JSON.parse(saved) : null; // Default to null (landing page is Login)
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('laundrylab_auth_user_v3', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('laundrylab_auth_user_v3');
    }
  }, [currentUser]);

  const login = (email: string, password?: string): boolean => {
    const found = ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (found && found.password === password) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
