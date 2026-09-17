import React from 'react';

export default function Pagination({ pagination, onPageChange }) {
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
