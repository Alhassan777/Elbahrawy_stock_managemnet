import React, { useState } from 'react';
import InventoryTab from '../components/InventoryTab';
import IntakeTab from '../components/IntakeTab';
import SalesTab from '../components/SalesTab';
import StaffTab from '../components/StaffTab';

const TABS = ['inventory', 'intake', 'sales', 'staff'];

export default function Dashboard() {
  const [tab, setTab] = useState('inventory');

  return (
    <div className="container">
      <div className="tabs">
        {TABS.map((t) => (
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
