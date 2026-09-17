import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
import Pagination from './Pagination';

export default function SalesTab() {
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
