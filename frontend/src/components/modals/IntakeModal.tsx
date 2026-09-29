import React, { useState } from 'react';
import { useLaundry, SERVICE_CATALOG, BANK_ACCOUNT_DETAILS } from '../../context/LaundryContext';
import { X, Send, ShoppingBag, Building, CreditCard, Smartphone } from 'lucide-react';
import { PaymentMethod, PaymentStatus, Order } from '../../types/laundry';

interface IntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntakeModal: React.FC<IntakeModalProps> = ({ isOpen, onClose }) => {
  const { currentBranch, addOrder, getBranchMachines } = useLaundry();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [weightOrQty, setWeightOrQty] = useState<number | ''>('');
  const [selectedMachineCode, setSelectedMachineCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pay Later (EFT / PayShap / Proof of Payment)');
  
  // Item count breakdown (Default to 0)
  const [shirts, setShirts] = useState<number | ''>(0);
  const [pants, setPants] = useState<number | ''>(0);
  const [jackets, setJackets] = useState<number | ''>(0);
  const [towels, setTowels] = useState<number | ''>(0);

  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const currentServiceObj = SERVICE_CATALOG.find(s => s.name === selectedService);
  const numWeight = typeof weightOrQty === 'number' ? weightOrQty : 0;
  const totalPrice = currentServiceObj ? numWeight * currentServiceObj.rate : 0;

  const numShirts = typeof shirts === 'number' ? shirts : 0;
  const numPants = typeof pants === 'number' ? pants : 0;
  const numJackets = typeof jackets === 'number' ? jackets : 0;
  const numTowels = typeof towels === 'number' ? towels : 0;
  const totalItemCount = numShirts + numPants + numJackets + numTowels;

  const availableMachines = getBranchMachines(currentBranch);

  const formatWhatsAppPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
      return '27' + digits.substring(1);
    }
    return digits;
  };

  const getWhatsAppLink = (order: Order): string => {
    const phone = formatWhatsAppPhone(order.customerPhone);
    const origin = window.location.origin;
    const ref = `${order.customerName} ${order.unitNumber ? order.unitNumber : ''}`.trim();
    const message = `LaundryLab Alert: Counter intake receipt for Order #${order.id} (R${order.amount.toFixed(2)}).\n📍 Branch: ${order.branch}\n🏢 Ref: ${ref}\n💳 Banking: Nedbank Acc 1338934171 | PayShap: 067 935 6086\n📱 Order Hub (Upload POP & Live Tracker): ${origin}/track/${order.id}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter customer name and phone number.');
      return;
    }
    if (!selectedService) {
      alert('Please select a service catalog item.');
      return;
    }
    if (!selectedMachineCode) {
      alert('Please select a machine allocation.');
      return;
    }
    if (!paymentMethod) {
      alert('Please select a payment method.');
      return;
    }

    let initialPaymentStatus: PaymentStatus = 'Pending (Pay Later)';
    if (paymentMethod === 'Speed Point/Cash(Paid at Counter)') {
      initialPaymentStatus = 'Paid (Counter)';
    }

    const createdOrder = addOrder({
      branch: currentBranch,
      staffName: 'Logged Operator',
      machineCode: selectedMachineCode,
      customerName,
      customerPhone,
      unitNumber: unitNumber.trim() || undefined,
      serviceName: currentServiceObj ? currentServiceObj.name : 'Service',
      ratePerUnit: currentServiceObj ? currentServiceObj.rate : 0,
      weightOrQty: numWeight || 1,
      unit: currentServiceObj ? currentServiceObj.unit : 'kg',
      itemsBreakdown: { shirts: numShirts, pants: numPants, jackets: numJackets, towels: numTowels },
      totalItemCount,
      itemsReturned: totalItemCount,
      paymentMethod: paymentMethod,
      paymentStatus: initialPaymentStatus,
      amount: totalPrice,
      status: 'Awaiting Start'
    });

    setSuccessOrder(createdOrder);
  };

  if (successOrder) {
    const waUrl = getWhatsAppLink(successOrder);
    const origin = window.location.origin;

    return (
      <div className="modal-overlay">
        <div className="modal-content glass-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '30px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--success-light)', 
            color: 'var(--success)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 20px auto',
            fontSize: '32px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
          
          <h2 style={{ marginBottom: '10px', color: 'var(--text-main)' }}>Intake Logged Successfully!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Order <strong>#{successOrder.id}</strong> has been logged for <strong>{successOrder.customerName}</strong>.
          </p>

          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Customer Mobile</span>
              <strong style={{ color: 'var(--text-main)' }}>{successOrder.customerPhone}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Allocated Machine</span>
              <strong style={{ color: 'var(--text-main)' }}>{successOrder.machineCode}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Service Rate</span>
              <strong style={{ color: 'var(--text-main)' }}>R{successOrder.ratePerUnit}/{successOrder.unit}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Amount</span>
              <span style={{ color: 'var(--success)' }}>R{successOrder.amount.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a 
              href={waUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-success" 
              style={{ padding: '12px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none', fontWeight: 'bold' }}
            >
              💬 Send Receipt via WhatsApp
            </a>
            
            <a 
              href={`${origin}/track/${successOrder.id}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-outline" 
              style={{ padding: '10px', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              📱 Preview Customer Order Hub (Live Tracker & POP)
            </a>

            <button 
              className="btn btn-primary" 
              style={{ padding: '12px', fontSize: '14px', marginTop: '6px' }}
              onClick={() => {
                setSuccessOrder(null);
                setCustomerName('');
                setCustomerPhone('');
                setUnitNumber('');
                setSelectedService('');
                setWeightOrQty('');
                setSelectedMachineCode('');
                setPaymentMethod('Pay Later (EFT / PayShap / Proof of Payment)');
                setShirts(0);
                setPants(0);
                setJackets(0);
                setTowels(0);
                onClose();
              }}
            >
              Done & Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} className="text-primary" /> New Customer Intake — {currentBranch}
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Customer Name</label>
              <input 
                type="text" 
                className="custom-input" 
                placeholder="e.g. John Miller"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Unit / Apt # (Payment Ref)</label>
              <input 
                type="text" 
                className="custom-input" 
                placeholder="e.g. Unit 402"
                value={unitNumber}
                onChange={e => setUnitNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Customer Mobile Number (For SMS Links & Receipt)</label>
            <input 
              type="text" 
              className="custom-input" 
              placeholder="e.g. 067 555 0192"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Service Catalog</label>
              <select 
                className="custom-select"
                value={selectedService}
                onChange={e => setSelectedService(e.target.value)}
                required
              >
                <option value="">Select Service</option>
                {SERVICE_CATALOG.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} (R{s.rate}/{s.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Weight (kg) or Pairs</label>
              <input 
                type="number" 
                className="custom-input" 
                step="0.5"
                min="0"
                placeholder="0"
                value={weightOrQty}
                onChange={e => setWeightOrQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
            <div className="form-group">
              <label>Machine Allocation</label>
              <select 
                className="custom-select" 
                value={selectedMachineCode}
                onChange={e => setSelectedMachineCode(e.target.value)}
                required
              >
                <option value="">Select Machine</option>
                {availableMachines.map(m => (
                  <option key={m.id} value={m.code} disabled={m.status !== 'Available'}>
                    {m.code} ({m.capacity}) {m.status !== 'Available' ? `— [${m.status}]` : '— Available'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Payment Preference</label>
              <select 
                className="custom-select" 
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                required
              >
                <option value="Pay Later (EFT / PayShap / Proof of Payment)">⏳ Drop-off & Pay Later (EFT / PayShap / POP)</option>
                <option value="Speed Point/Cash(Paid at Counter)">💳 Speed Point / Cash (Paid at Counter Now)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
            <label style={{ color: 'var(--text-main)', marginBottom: '8px' }}>
              Item Count Breakdown (Mandatory for Customer Return Verification)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Shirts / Tops</span>
                <input type="number" min="0" className="custom-input" value={shirts} onChange={e => setShirts(e.target.value === '' ? '' : parseInt(e.target.value))} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pants / Shorts</span>
                <input type="number" min="0" className="custom-input" value={pants} onChange={e => setPants(e.target.value === '' ? '' : parseInt(e.target.value))} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Jackets / Outerwear</span>
                <input type="number" min="0" className="custom-input" value={jackets} onChange={e => setJackets(e.target.value === '' ? '' : parseInt(e.target.value))} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Towels / Bedding</span>
                <input type="number" min="0" className="custom-input" value={towels} onChange={e => setTowels(e.target.value === '' ? '' : parseInt(e.target.value))} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Items: {totalItemCount}</span>
              <h3 style={{ color: 'var(--success)' }}>Payable: R{totalPrice.toFixed(2)}</h3>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
              <Send size={16} /> Log Intake
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

