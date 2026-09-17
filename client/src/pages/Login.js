import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

export default function Login() {
  const { login } = useAuth();
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login(Number(staffId), pin);
      login(result.token, result.staff);
    } catch (err) {
      setError(err.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24, fontSize: '1.4rem' }}>
          Laptop Stock Manager
        </h1>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Staff ID</label>
            <input
              type="number"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              maxLength={8}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
