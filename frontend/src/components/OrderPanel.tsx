import React, { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPrice } from '../helpers/format';
import { AlertPanel } from './AlertPanel';
import { usePortfolio } from '../context/PortfolioContext';
import { usePortfolioMetrics } from '../hooks/usePortfolioMetrics';

type OrderType = 'Market' | 'Limit' | 'Stop';
type OrderSide = 'buy' | 'sell';

const ORDER_TYPES: OrderType[] = ['Market', 'Limit', 'Stop'];

interface OrderPanelProps {
  selectedSymbol: string;
  bidPrice: number;
  askPrice: number;
  spreadPips: number;
  isAuthenticated: boolean;
  onRequireAuth: (reason: string) => void;
  onOrderSuccess?: (message: string) => void;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
  selectedSymbol,
  bidPrice,
  askPrice,
  spreadPips,
  isAuthenticated,
  onRequireAuth,
  onOrderSuccess,
}) => {
  const { positions, openPosition } = usePortfolio();
  const { freeMargin } = usePortfolioMetrics();
  const [lots, setLots] = useState<number>(0.1);
  const [orderType, setOrderType] = useState<OrderType>('Market');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');

  const currentPrice = orderSide === 'buy' ? askPrice : bidPrice;
  const quotedPrice = orderSide === 'buy' ? askPrice : bidPrice;
  const units = Math.floor(lots * 100000);
  const margin = (units * currentPrice) / 100;
  const symbolUnits =
    selectedSymbol.split('/')[0] ||
    selectedSymbol.split('-')[0] ||
    selectedSymbol;

  let requiredMargin = margin;
  const existingPos = positions.find((p) => p.symbol === selectedSymbol);

  if (existingPos && existingPos.side !== orderSide) {
    if (units <= existingPos.units) {
      requiredMargin = 0; // Fully covered by closing existing position
    } else {
      const remainingUnits = units - existingPos.units;
      requiredMargin = (remainingUnits * currentPrice) / 100; // Margin only for the flipped amount
    }
  }

  const takeProfit = orderSide === 'buy' ? askPrice * 1.005 : bidPrice * 0.995;
  const stopLoss = orderSide === 'buy' ? bidPrice * 0.995 : askPrice * 1.005;
  const isOrderEnabled =
    lots > 0 && (requiredMargin === 0 || freeMargin >= requiredMargin);
  const orderActionLabel = orderSide === 'buy' ? 'Buy / Long' : 'Sell / Short';
  const orderPriceLabel =
    orderType === 'Market' ? 'Execution Price' : `${orderType} Price`;
  const orderSummaryLabel = `${orderType} ${orderSide === 'buy' ? 'Buy' : 'Sell'}`;

  const handleOrder = () => {
    if (!isAuthenticated) {
      onRequireAuth(
        `Sign in before placing a ${orderType.toLowerCase()} ${orderSide} order on ${selectedSymbol}.`,
      );
      return;
    }

    openPosition({
      symbol: selectedSymbol,
      side: orderSide,
      units,
      openPrice: quotedPrice,
      margin,
    });

    setLots(0.1);
    if (onOrderSuccess) {
      onOrderSuccess(
        `Successfully placed a ${orderType} ${orderSide} order for ${units.toLocaleString()} units of ${selectedSymbol}.`,
      );
    }
  };

  return (
    <aside className="order-panel">
      <div className="order-tabs">
        {ORDER_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`order-tab ${orderType === type ? 'active' : ''}`}
            onClick={() => setOrderType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="order-content">
        <div className="price-pill-container">
          <button
            type="button"
            className={`price-pill sell ${orderSide === 'sell' ? 'active' : ''}`}
            onClick={() => setOrderSide('sell')}
          >
            <div className="price-pill-label price-pill-label-sell text-caption">
              <TrendingDown size={14} /> SELL
            </div>
            <div className="price-pill-value text-price">
              {formatPrice(bidPrice)}
            </div>
          </button>

          <div className="spread-chip" title="Spread (Pips)">
            {spreadPips} pip
          </div>

          <button
            type="button"
            className={`price-pill buy ${orderSide === 'buy' ? 'active' : ''}`}
            onClick={() => setOrderSide('buy')}
          >
            <div className="price-pill-label price-pill-label-buy text-caption">
              <TrendingUp size={14} /> BUY
            </div>
            <div className="price-pill-value price-pill-value-buy text-price">
              {formatPrice(askPrice)}
            </div>
          </button>
        </div>

        <div className="order-summary-card">
          <span className="text-caption order-summary-label">
            {orderSummaryLabel}
          </span>
          <strong className="order-summary-price">
            {formatPrice(quotedPrice)}
          </strong>
        </div>

        <div className="form-group">
          <div className="form-label">
            <span>Free Margin</span>
            <span className="form-label-value">
              {freeMargin.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              USD
            </span>
          </div>
        </div>

        <div className="form-group form-group-spaced">
          <div className="form-label">
            <span>Lots</span>
            <span className="form-label-hint" title="1 Lot = 100,000 Units">
              (i)
            </span>
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

        <div className="form-group form-group-metric">
          <span className="text-caption">Required Margin (1:100)</span>
          <span className="text-price form-metric-value">
            {requiredMargin.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })}
          </span>
        </div>

        <div className="form-group form-group-metric">
          <span className="text-caption">Units</span>
          <span className="text-price form-metric-value">
            {units.toLocaleString()} {symbolUnits}
          </span>
        </div>

        <div className="form-group form-group-metric">
          <span className="text-caption">{orderPriceLabel}</span>
          <span className="text-price form-metric-value">
            {formatPrice(quotedPrice)}
          </span>
        </div>

        <div className="form-group form-group-spaced">
          <div className="form-label">
            <span>Take Profit</span>
          </div>
          <input
            type="text"
            value={formatPrice(takeProfit)}
            readOnly
            className="form-input form-input-success"
          />
        </div>

        <div className="form-group">
          <div className="form-label">
            <span>Stop Loss</span>
          </div>
          <input
            type="text"
            value={formatPrice(stopLoss)}
            readOnly
            className="form-input form-input-danger"
          />
        </div>

        <button
          className={`order-submit ${isOrderEnabled ? 'is-enabled' : 'is-disabled'}`}
          disabled={!isOrderEnabled}
          type="button"
          onClick={handleOrder}
        >
          {isAuthenticated
            ? isOrderEnabled
              ? `${orderActionLabel} ${selectedSymbol}`
              : `Insufficient Balance`
            : `Sign in to trade ${selectedSymbol}`}
        </button>

        <AlertPanel
          selectedSymbol={selectedSymbol}
          currentPrice={quotedPrice}
          isAuthenticated={isAuthenticated}
          onRequireAuth={onRequireAuth}
        />
      </div>
    </aside>
  );
};
