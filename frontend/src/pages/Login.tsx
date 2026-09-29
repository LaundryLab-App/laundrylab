import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ACCOUNTS } from '../context/AuthContext';
import { useLaundry } from '../context/LaundryContext';
import { Sparkles, LogIn, Building2, Shield, UserCheck, KeyRound } from 'lucide-react';
import { BranchName } from '../types/laundry';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { setCurrentBranch, setCurrentRole } = useLaundry();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      const found = ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());
      if (found) {
        if (found.role === 'Owner') {
          setCurrentRole('Owner');
          navigate('/admin');
        } else {
          setCurrentRole('Operator');
          setCurrentBranch(found.assignedBranch as BranchName);
          navigate('/staff');
        }
      }
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '640px', paddingTop: '60px' }}>
      <div className="glass-card" style={{ padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="logo-icon" style={{ margin: '0 auto 12px auto', width: '56px', height: '56px', fontSize: '26px' }}>
            <Sparkles />
          </div>
          <h2 style={{ fontSize: '26px', background: 'linear-gradient(90deg, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LaundryLab Access Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Sign in to your allocated branch staff station or owner administration portal
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} style={{ marginBottom: '16px' }}>
          {error && (
            <div style={{ background: 'var(--danger-light)', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Employee / Owner Email Address</label>
            <input 
              type="email" 
              className="custom-input" 
              placeholder="e.g. clyde@laundylab.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <KeyRound size={14} style={{ color: 'var(--text-muted)' }} /> Password
            </label>
            <input 
              type="password" 
              className="custom-input" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            <LogIn size={16} /> Sign In to Assigned Branch
          </button>
        </form>

        <hr style={{ borderColor: 'var(--border-color)', margin: '24px 0' }} />

        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border-color)' }}>
          <details style={{ cursor: 'pointer' }}>
            <summary style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, userSelect: 'none' }}>
              Show Demo/Testing Credentials
            </summary>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {ACCOUNTS.map(acc => (
                <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--primary-light)' }}>{acc.name}</strong> 
                    <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      ({acc.assignedBranch === 'All Branches' ? 'Owner' : acc.assignedBranch})
                    </span>
                  </div>
                  <div>
                    <code>{acc.email}</code> / <code>{acc.password}</code>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};
