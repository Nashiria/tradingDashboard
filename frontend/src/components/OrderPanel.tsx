import React, { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPrice } from '../helpers/format';

interface OrderPanelProps {
  selectedSymbol: string;
  bidPrice: number;
  askPrice: number;
  spreadPips: number;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({ 
  selectedSymbol, 
  bidPrice, 
  askPrice, 
  spreadPips 
}) => {
  const [lots, setLots] = useState<number>(0.10);
  
  const currentPrice = bidPrice; // Just for margin calculation 
  const units = Math.floor(lots * 100000); 
  const margin = (units * currentPrice) / 100;
  
  const takeProfit = askPrice * 1.005; 
  const stopLoss = bidPrice * 0.995;

  return (
    <aside className="order-panel">
      <div className="order-tabs">
        <div className="order-tab active">Market</div>
        <div className="order-tab">Limit</div>
        <div className="order-tab">Stop</div>
      </div>

      <div className="order-content">
        <div className="price-pill-container">
          <div className="price-pill sell">
            <div className="text-caption" style={{ color: 'var(--danger)', marginBottom: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
               <TrendingDown size={14} /> SELL
            </div>
            <div className="text-price" style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {formatPrice(bidPrice)}
            </div>
          </div>
          
          <div className="spread-chip" title="Spread (Pips)">{spreadPips} pip</div>

          <div className="price-pill buy">
            <div className="text-caption" style={{ color: 'white', marginBottom: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> BUY
            </div>
            <div className="text-price" style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
              {formatPrice(askPrice)}
            </div>
          </div>
        </div>

        <div className="form-group">
          <div className="form-label">
            <span>You have</span>
            <span style={{ color: 'var(--text-primary)' }}>10,000.00 USD</span>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '24px' }}>
          <div className="form-label">
            <span>Lots</span>
            <span style={{ cursor: 'pointer', color: 'var(--accent-blue)' }} title="1 Lot = 100,000 Units">(i)</span>
          </div>
          <input 
            type="number" 
            value={lots} 
            step="0.01" 
            min="0.01"
            onChange={(e) => setLots(Number(e.target.value))}
            className="form-input" 
          />
        </div>

        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <span className="text-caption">Initial margin (1:100)</span>
          <span className="text-price" style={{ fontSize: '13px' }}>
            {margin.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        </div>

        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <span className="text-caption">Units</span>
          <span className="text-price" style={{ fontSize: '13px' }}>
            {units.toLocaleString()} {selectedSymbol.split('-')[0] || selectedSymbol}
          </span>
        </div>

        <div className="form-group" style={{ marginTop: '24px' }}>
          <div className="form-label">
            <span>Take Profit</span>
          </div>
          <input type="text" value={formatPrice(takeProfit)} readOnly className="form-input" style={{ color: 'var(--success)' }} />
        </div>

        <div className="form-group">
          <div className="form-label">
            <span>Stop Loss</span>
          </div>
          <input type="text" value={formatPrice(stopLoss)} readOnly className="form-input" style={{ color: 'var(--danger)' }} />
        </div>

        <button style={{ 
          width: '100%', 
          backgroundColor: lots > 0 ? 'var(--success)' : 'rgba(34, 197, 94, 0.5)', 
          color: 'white', 
          border: 'none', 
          padding: '14px', 
          borderRadius: '8px', 
          fontWeight: 600, 
          fontSize: '14px',
          marginTop: '16px',
          cursor: lots > 0 ? 'pointer' : 'not-allowed'
        }}>
          Buy / Long {selectedSymbol}
        </button>
      </div>
    </aside>
  );
};
