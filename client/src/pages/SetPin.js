import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

export default function SetPin() {
  const { token, updateAuth } = useAuth();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      setError('PIN must be 4-8 digits');
      return;
    }
    setLoading(true);
    try {
      const result = await api.setPin(newPin, confirmPin, token);
      updateAuth(result.token, result.staff);
    } catch (err) {
      setError(err.error || 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.4rem' }}>
          Set Your New PIN
        </h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 20, fontSize: '0.9rem' }}>
          You must set a new PIN before continuing.
        </p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New PIN (4-8 digits)</label>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
              maxLength={8}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              required
              maxLength={8}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Saving...' : 'Set PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
