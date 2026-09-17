import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

export default function StaffTab() {
  const { token } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({ name: '', role: 'cashier' });
  const [tempPin, setTempPin] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const data = await api.getStaff(token);
      setStaffList(data);
    } catch {}
  }, [token]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setTempPin(null);
    setLoading(true);
    try {
      const result = await api.createStaff(form, token);
      setTempPin({ id: result.staff.staff_id, name: result.staff.name, pin: result.temporary_pin });
      setForm({ name: '', role: 'cashier' });
      loadStaff();
    } catch (err) {
      setError(err.error || 'Failed to create staff');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (id) => {
    try {
      const result = await api.resetStaffPin(id, token);
      setTempPin({ id: result.staff_id, name: staffList.find(s => s.staff_id === id)?.name, pin: result.temporary_pin });
      loadStaff();
    } catch (err) {
      setError(err.error || 'Failed to reset PIN');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    try {
      await api.deleteStaff(id, token);
      loadStaff();
    } catch (err) {
      setError(err.error || 'Failed to delete staff');
    }
  };

  return (
    <div>
      {tempPin && (
        <div className="success-msg" style={{ marginBottom: 16 }}>
          <strong>Temporary PIN for {tempPin.name} (ID: {tempPin.id}):</strong>{' '}
          <span style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace' }}>{tempPin.pin}</span>
          <br />Save this PIN — it will not be shown again.
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Add Staff Member</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group" style={{ minWidth: 120 }}>
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="btn btn-success" disabled={loading} style={{ height: 38, marginBottom: 12 }}>
            {loading ? 'Creating...' : 'Add'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Staff List</h3>
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {staffList.map((s) => (
              <tr key={s.staff_id}>
                <td>{s.staff_id}</td>
                <td>{s.name} {s.requires_pin_reset && <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>(PIN reset pending)</span>}</td>
                <td>{s.role}</td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.8rem', marginRight: 4 }} onClick={() => handleResetPin(s.staff_id)}>
                    Reset PIN
                  </button>
                  <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => handleDelete(s.staff_id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
