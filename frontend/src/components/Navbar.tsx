import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLaundry, BRANCHES } from '../context/LaundryContext';
import { useAuth } from '../context/AuthContext';
import { BranchName } from '../types/laundry';
import { 
  Sparkles, 
  UserCheck, 
  PieChart, 
  FileText, 
  Building2, 
  LogOut, 
  Shield 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentBranch, setCurrentBranch } = useLaundry();
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Strict Segregation: Hide Navbar completely on Customer pages (/track/* and /pay/*)
  if (location.pathname.startsWith('/track') || location.pathname.startsWith('/pay')) {
    return null;
  }

  // 2. Hide Navbar on Login page
  if (location.pathname === '/login') {
    return null;
  }

  if (!currentUser) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="logo-icon">
          <Sparkles size={22} />
        </div>
        <div className="brand-text">
          <span className="brand-name">LAUNDRYLAB</span>
        </div>
      </div>

      <div className="nav-links">
        {/* Employee Only Link */}
        {currentUser.role === 'Operator' && (
          <NavLink 
            to="/staff" 
            className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
          >
            <UserCheck size={16} /> Staff Counter Station ({currentUser.assignedBranch})
          </NavLink>
        )}

        {/* Admin Only Links */}
        {currentUser.role === 'Owner' && (
          <>
            <NavLink 
              to="/admin" 
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              <PieChart size={16} /> Owner Multi-Branch Portal
            </NavLink>

            <NavLink 
              to="/proposal" 
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              <FileText size={16} /> Platform Proposal
            </NavLink>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Branch indicator / lock */}
        {currentUser.role === 'Operator' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-light)', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {currentUser.assignedBranch} (Locked)
            </span>
          </div>
        )}

        {/* User Pill & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>
            {currentUser.name} {currentUser.role === 'Owner' && <Shield size={12} className="text-warning" style={{ display: 'inline', marginLeft: '4px' }} />}
          </span>
          <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={handleLogout}>
            <LogOut size={14} /> Exit
          </button>
        </div>
      </div>
    </nav>
  );
};
