import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button
        className="btn btn-secondary"
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
        style={{ padding: '4px 12px', fontSize: '0.85rem' }}
      >
        Prev
      </button>
      <span style={{ fontSize: '0.875rem' }}>
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <button
        className="btn btn-secondary"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onPageChange(pagination.page + 1)}
        style={{ padding: '4px 12px', fontSize: '0.85rem' }}
      >
        Next
      </button>
    </div>
  );
}

function InventoryTab() {
  const { token } = useAuth();
  const [units, setUnits] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ status: '', grade: '', brand: '', sort: 'received_at', order: 'desc' });
  const [page, setPage] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitTxns, setUnitTxns] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.grade) params.grade = filters.grade;
      if (filters.brand) params.brand = filters.brand;
      if (filters.sort) params.sort = filters.sort;
      if (filters.order) params.order = filters.order;
      const result = await api.getUnits(params, token);
      setUnits(result.data);
      setPagination(result.pagination);
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, filters]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  const viewUnit = async (unit) => {
    setSelectedUnit(unit);
    try {
      const txns = await api.getUnitTransactions(unit.unit_id, token);
      setUnitTxns(txns);
    } catch {
      setUnitTxns([]);
    }
  };

  if (selectedUnit) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => setSelectedUnit(null)} style={{ marginBottom: 16 }}>
          Back to Inventory
        </button>
        <div className="card">
          <h2>{selectedUnit.brand} {selectedUnit.model}</h2>
          <p><strong>QR Code:</strong> {selectedUnit.qr_code}</p>
          <p><strong>Grade:</strong> <span className={`badge badge-${selectedUnit.grade.toLowerCase()}`}>{selectedUnit.grade}</span></p>
          <p><strong>Status:</strong> <span className={`badge badge-${selectedUnit.status}`}>{selectedUnit.status}</span></p>
          <p><strong>Price:</strong> ${Number(selectedUnit.price).toFixed(2)}</p>
          <p><strong>Specs:</strong> CPU: {selectedUnit.specs?.cpu}, RAM: {selectedUnit.specs?.ram}, Storage: {selectedUnit.specs?.storage}</p>
          {selectedUnit.condition_notes && <p><strong>Condition:</strong> {selectedUnit.condition_notes}</p>}
          {selectedUnit.supplier && <p><strong>Supplier:</strong> {selectedUnit.supplier}</p>}
          <p><strong>Received:</strong> {new Date(selectedUnit.received_at).toLocaleDateString()}</p>
          <div style={{ marginTop: 16 }}>
            <img
              src={api.getUnitQrUrl(selectedUnit.unit_id)}
              alt={`QR ${selectedUnit.qr_code}`}
              style={{ width: 200, height: 200 }}
              crossOrigin="anonymous"
            />
          </div>
        </div>
        {unitTxns.length > 0 && (
          <div className="card">
            <h3>Transaction History</h3>
            <table>
              <thead>
                <tr><th>Type</th><th>Price</th><th>Staff</th><th>Date</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {unitTxns.map((t) => (
                  <tr key={t.txn_id}>
                    <td>{t.type}</td>
                    <td>${Number(t.price_at_sale).toFixed(2)}</td>
                    <td>{t.staff?.name}</td>
                    <td>{new Date(t.timestamp).toLocaleDateString()}</td>
                    <td>{t.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="filters">
        <select value={filters.status} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="sold">Sold</option>
        </select>
        <select value={filters.grade} onChange={(e) => { setFilters(f => ({ ...f, grade: e.target.value })); setPage(1); }}>
          <option value="">All Grades</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <input
          placeholder="Brand..."
          value={filters.brand}
          onChange={(e) => { setFilters(f => ({ ...f, brand: e.target.value })); setPage(1); }}
        />
        <select value={`${filters.sort}-${filters.order}`} onChange={(e) => {
          const [s, o] = e.target.value.split('-');
          setFilters(f => ({ ...f, sort: s, order: o }));
          setPage(1);
        }}>
          <option value="received_at-desc">Newest First</option>
          <option value="received_at-asc">Oldest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>
      {loading ? (
        <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>QR Code</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Grade</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="desktop-only">Received</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.unit_id} onClick={() => viewUnit(u)} style={{ cursor: 'pointer' }}>
                    <td>{u.qr_code}</td>
                    <td>{u.brand}</td>
                    <td>{u.model}</td>
                    <td><span className={`badge badge-${u.grade.toLowerCase()}`}>{u.grade}</span></td>
                    <td>${Number(u.price).toFixed(2)}</td>
                    <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                    <td className="desktop-only">{new Date(u.received_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {units.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>No units found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function IntakeTab() {
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

function SalesTab() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ available: 0, sold: 0, revenue: 0 });
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [avail, soldRes] = await Promise.all([
          api.getUnits({ status: 'available', limit: 1 }, token),
          api.getUnits({ status: 'sold', limit: 1 }, token),
        ]);
        const txnResult = await api.getTransactions({ page, limit: 20 }, token);
        const revenue = txnResult.data
          .filter(t => t.type === 'sale')
          .reduce((sum, t) => sum + Number(t.price_at_sale), 0);

        setStats({
          available: avail.pagination.total,
          sold: soldRes.pagination.total,
          revenue: txnResult.data.length > 0 ? revenue : 0,
        });
        setTransactions(txnResult.data);
        setPagination(txnResult.pagination);
      } catch {}
    })();
  }, [token, page]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>{stats.available}</div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Available Units</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6b7280' }}>{stats.sold}</div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Sold Units</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>${stats.revenue.toFixed(2)}</div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Revenue (this page)</div>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Transactions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>ID</th><th>Unit</th><th>Type</th><th>Amount</th><th>Staff</th><th>Date</th></tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.txn_id}>
                  <td>{t.txn_id}</td>
                  <td>{t.unit?.qr_code} — {t.unit?.brand} {t.unit?.model}</td>
                  <td>{t.type}</td>
                  <td>${Number(t.price_at_sale).toFixed(2)}</td>
                  <td>{t.staff?.name}</td>
                  <td>{new Date(t.timestamp).toLocaleDateString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}

function StaffTab() {
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

export default function Dashboard() {
  const [tab, setTab] = useState('inventory');

  return (
    <div className="container">
      <div className="tabs">
        {['inventory', 'intake', 'sales', 'staff'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'inventory' && <InventoryTab />}
      {tab === 'intake' && <IntakeTab />}
      {tab === 'sales' && <SalesTab />}
      {tab === 'staff' && <StaffTab />}
    </div>
  );
}
