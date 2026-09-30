import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LaundryProvider, useLaundry } from './context/LaundryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { StaffStation } from './pages/StaffStation';
import { CustomerPortal } from './pages/CustomerPortal';
import { AdminPortal } from './pages/AdminPortal';
import { ProposalView } from './pages/ProposalView';

const ToastNotification: React.FC = () => {
  const { toastMessage } = useLaundry();
  if (!toastMessage) return null;

  return (
    <div className="toast" style={{ background: toastMessage.type === 'error' ? 'var(--danger)' : 'var(--primary)' }}>
      {toastMessage.text}
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return currentUser.role === 'Owner' 
    ? <Navigate to="/admin" replace /> 
    : <Navigate to="/staff" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LaundryProvider>
        <BrowserRouter>
          <div style={{ minHeight: '100vh' }}>
            <Navbar />
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Employee Protected Route */}
              <Route 
                path="/staff" 
                element={
                  <ProtectedRoute allowedRoles={['Operator']}>
                    <StaffStation />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin Protected Routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['Owner']}>
                    <AdminPortal />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/proposal" 
                element={
                  <ProtectedRoute allowedRoles={['Owner']}>
                    <ProposalView />
                  </ProtectedRoute>
                } 
              />

              {/* Customer Standalone Public Routes (No Navbar) */}
              <Route path="/track" element={<CustomerPortal />} />
              <Route path="/pay" element={<CustomerPortal />} />
              <Route path="/track/:orderId" element={<CustomerPortal />} />
              <Route path="/pay/:orderId" element={<CustomerPortal />} />

              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
            <ToastNotification />
          </div>
        </BrowserRouter>
      </LaundryProvider>
    </AuthProvider>
  );
};

export default App;
