import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Nav() {
  const { staff, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="nav no-print">
      <span className="nav-brand">Laptop Stock Manager</span>
      <div className="nav-links">
        {staff?.role === 'admin' && (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              style={location.pathname === '/dashboard' ? { background: 'rgba(255,255,255,0.15)' } : {}}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/scan')}
              style={location.pathname === '/scan' ? { background: 'rgba(255,255,255,0.15)' } : {}}
            >
              Scan
            </button>
          </>
        )}
        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
          {staff?.name} ({staff?.role})
        </span>
        <button onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
