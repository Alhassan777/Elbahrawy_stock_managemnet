import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

export default function IntakeTab() {
  const { token } = useAuth();
  const [form, setForm] = useState({ brand: '', model: '', cpu: '', ram: '', storage: '', grade: 'A', condition_notes: '', price: '', supplier: '' });
  const [error, setError] = useState('');
  const [createdUnit, setCreatedUnit] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const unit = await api.createUnit({
        brand: form.brand,
        model: form.model,
        specs: { cpu: form.cpu, ram: form.ram, storage: form.storage },
        grade: form.grade,
        condition_notes: form.condition_notes || undefined,
        price: Number(form.price),
        supplier: form.supplier || undefined,
      }, token);
      setCreatedUnit(unit);
      setForm({ brand: '', model: '', cpu: '', ram: '', storage: '', grade: 'A', condition_notes: '', price: '', supplier: '' });
    } catch (err) {
      setError(err.error || 'Failed to create unit');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (createdUnit) {
    return (
      <div className="card unit-detail-card">
        <div className="success-msg">Unit created successfully!</div>
        <h2>{createdUnit.brand} {createdUnit.model}</h2>
        <p>{createdUnit.qr_code}</p>
        <div style={{ margin: '16px auto' }}>
          <img
            src={api.getUnitQrUrl(createdUnit.unit_id)}
            alt={`QR ${createdUnit.qr_code}`}
            style={{ width: 250, height: 250 }}
            crossOrigin="anonymous"
          />
        </div>
        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{createdUnit.qr_code}</p>
        <div className="no-print" style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={handlePrint}>Print QR Label</button>
          <button className="btn btn-secondary" onClick={() => setCreatedUnit(null)}>Add Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>Add New Unit</h2>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label>Brand</label>
            <input value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Model</label>
            <input value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>CPU</label>
            <input value={form.cpu} onChange={(e) => setForm(f => ({ ...f, cpu: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>RAM</label>
            <input value={form.ram} onChange={(e) => setForm(f => ({ ...f, ram: e.target.value }))} required placeholder="e.g. 16GB" />
          </div>
          <div className="form-group">
            <label>Storage</label>
            <input value={form.storage} onChange={(e) => setForm(f => ({ ...f, storage: e.target.value }))} required placeholder="e.g. 512GB SSD" />
          </div>
          <div className="form-group">
            <label>Grade</label>
            <select value={form.grade} onChange={(e) => setForm(f => ({ ...f, grade: e.target.value }))}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <div className="form-group">
            <label>Price ($)</label>
            <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Supplier</label>
            <input value={form.supplier} onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Condition Notes</label>
          <textarea rows={2} value={form.condition_notes} onChange={(e) => setForm(f => ({ ...f, condition_notes: e.target.value }))} />
        </div>
        <button className="btn btn-success" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Creating...' : 'Create Unit'}
        </button>
      </form>
    </div>
  );
}
