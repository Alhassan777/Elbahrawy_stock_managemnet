import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

export default function Scanner() {
  const { token } = useAuth();
  const [unit, setUnit] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanning, setScanning] = useState(true);
  const [selling, setSelling] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!scanning) return;

    let html5Qr = null;

    const startScanner = async () => {
      try {
        html5Qr = new Html5Qrcode('qr-reader');
        scannerRef.current = html5Qr;
        await html5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await html5Qr.stop();
            scannerRef.current = null;
            setScanning(false);
            handleScan(decodedText);
          },
          () => {}
        );
      } catch (err) {
        setError('Camera access denied or not available. You can also enter a unit ID manually.');
      }
    };

    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  const handleScan = async (code) => {
    setError('');
    setSuccess('');
    setUnit(null);

    const match = code.match(/UNIT-(\d+)/);
    if (!match) {
      setError(`Invalid QR code: "${code}"`);
      return;
    }

    const unitId = parseInt(match[1], 10);
    try {
      const data = await api.getUnit(unitId, token);
      setUnit(data);
    } catch (err) {
      setError(err.error || 'Unit not found');
    }
  };

  const handleSell = async () => {
    if (!unit) return;
    setSelling(true);
    setError('');
    try {
      await api.sellUnit(unit.unit_id, null, token);
      setSuccess(`${unit.brand} ${unit.model} marked as sold!`);
      setUnit(null);
    } catch (err) {
      setError(err.error || 'Sale failed');
    } finally {
      setSelling(false);
    }
  };

  const resetScanner = () => {
    setUnit(null);
    setError('');
    setSuccess('');
    setScanning(true);
  };

  const [manualCode, setManualCode] = useState('');
  const handleManualLookup = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      setScanning(false);
      handleScan(manualCode.trim().toUpperCase());
    }
  };

  return (
    <div className="container scanner-container">
      <h2 style={{ textAlign: 'center', marginBottom: 16 }}>Scan Unit QR Code</h2>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {scanning && (
        <div style={{ marginBottom: 16 }}>
          <div id="qr-reader" ref={containerRef} style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }} />
        </div>
      )}

      <form onSubmit={handleManualLookup} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="UNIT-00001"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
        />
        <button className="btn btn-primary" type="submit">Lookup</button>
      </form>

      {unit && (
        <div className="card unit-detail-card">
          <h2>{unit.brand} {unit.model}</h2>
          <p><span className={`badge badge-${unit.grade.toLowerCase()}`}>{unit.grade}</span></p>
          <p className="price">${Number(unit.price).toFixed(2)}</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {unit.specs?.cpu} | {unit.specs?.ram} | {unit.specs?.storage}
          </p>
          <p>
            <span className={`badge badge-${unit.status}`}>{unit.status}</span>
          </p>
          {unit.status === 'available' ? (
            <button
              className="btn btn-success"
              onClick={handleSell}
              disabled={selling}
              style={{ marginTop: 16, width: '100%', padding: '12px', fontSize: '1.1rem' }}
            >
              {selling ? 'Processing...' : 'Confirm Sale'}
            </button>
          ) : (
            <p style={{ marginTop: 12, color: '#6b7280' }}>This unit has already been sold.</p>
          )}
        </div>
      )}

      {(!scanning || success || error) && (
        <button className="btn btn-secondary" onClick={resetScanner} style={{ width: '100%', marginTop: 12 }}>
          Scan Another
        </button>
      )}
    </div>
  );
}
