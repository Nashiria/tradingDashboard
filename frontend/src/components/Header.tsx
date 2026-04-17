import React from 'react';
import { CircleUser } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
          MockBank<span style={{color: 'var(--accent-blue)'}}>.</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <button style={{ backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
          Deposit
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Equity</span>
          <strong style={{color: 'white', fontSize: '14px'}}>10,000.00 USD</strong>
          <span style={{ color: 'var(--success)', fontSize: '12px' }}>+0.00%</span>
          <div style={{ backgroundColor: 'var(--danger)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }} title="Margin Call Risk Indicator">Margin: 904</div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="pill demo">Demo</span>
          <span className="pill standard">Standard</span>
          <span className="pill standard">Hedging</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>EN</span>
          <CircleUser size={32} color="var(--text-secondary)" />
        </div>
      </div>
    </header>
  );
};
