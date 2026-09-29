import React from 'react';
import { FileText, CheckCircle2, ShieldCheck, Zap, Sparkles, Building2, CreditCard } from 'lucide-react';
import { BRANCHES } from '../context/LaundryContext';

export const ProposalView: React.FC = () => {
  return (
    <div className="app-container" style={{ maxWidth: '1000px' }}>
      <div className="glass-card" style={{ padding: '36px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="logo-icon" style={{ width: '50px', height: '50px', fontSize: '24px' }}>
            <Sparkles />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', background: 'linear-gradient(90deg, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LaundryLab Platform Proposal
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Multi-Branch Operations, SMS Link Checkout & Garment Verification System
            </p>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border-color)', margin: '20px 0' }} />

        <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={20} className="text-warning" /> Executive Summary
        </h3>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '24px' }}>
          LaundryLab is designed to digitize and scale ground-floor laundry operations across multiple commercial and residential property sites. 
          By combining staff counter intake with automated SMS link generation, customers receive instant digital receipts, online payment options, 
          live cycle tracking, and digital garment return sign-off on their mobile phones.
        </p>

        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} className="text-primary" /> Active Laundry Mat Branches (4 Washing Machines Each — No Dryers)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '32px' }}>
          {BRANCHES.map(b => (
            <div key={b.name} style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--primary-light)' }}>{b.name}</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{b.address}</p>
              <span className="badge badge-available" style={{ marginTop: '8px', display: 'inline-block' }}>
                4 Washing Machines (W-01 to W-04)
              </span>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} className="text-success" /> Core System Capabilities
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-light)', marginBottom: '8px' }}>
              <CheckCircle2 size={16} /> 1. Staff Counter Station
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Quick customer intake, rate calculator, machine allocation (W-01 to W-04), and 7 PM end-of-day cashless shift reconciliation.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', marginBottom: '8px' }}>
              <CreditCard size={16} /> 2. SMS Mobile Link Portal
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Instant SMS link to customer smartphone for online payment (Apple Pay, Card, Instant EFT) and live cycle countdown tracker.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', marginBottom: '8px' }}>
              <ShieldCheck size={16} /> 3. Garment Return Verification
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Itemized garment count checklist preventing lost clothes and enabling customer digital sign-off upon pickup.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', marginBottom: '8px' }}>
              <FileText size={16} /> 4. Owner Multi-Branch Portal
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Single pane of glass across all 6 branches, real-time revenue analytics, machine utilization audit, and Excel/CSV export.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
