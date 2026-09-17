import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
import Pagination from './Pagination';

export default function InventoryTab() {
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
