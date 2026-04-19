import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Trash2 } from 'lucide-react';
import { AlertDirection, PriceAlert } from '../models/Alert';
import { formatPrice } from '../helpers/format';
import { useAuth } from '../context/AuthContext';
import { alertsApi } from '../services/alertsApi';

interface AlertPanelProps {
  selectedSymbol: string;
  currentPrice: number;
  isAuthenticated: boolean;
  onRequireAuth: (reason: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({
  selectedSymbol,
  currentPrice,
  isAuthenticated,
  onRequireAuth,
}) => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTargetPrice(currentPrice > 0 ? currentPrice.toFixed(5) : '');
  }, [currentPrice, selectedSymbol]);

  useEffect(() => {
    if (!token) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    alertsApi
      .listAlerts(token)
      .then(setAlerts)
      .finally(() => setIsLoading(false));
  }, [token]);

  const symbolAlerts = useMemo(
    () => alerts.filter((alert) => alert.symbol === selectedSymbol),
    [alerts, selectedSymbol],
  );

  const createAlert = async () => {
    if (!token) {
      onRequireAuth(`Sign in to create price alerts for ${selectedSymbol}.`);
      return;
    }

    const nextTargetPrice = Number(targetPrice);
    if (!Number.isFinite(nextTargetPrice) || nextTargetPrice <= 0) {
      return;
    }

    setIsSaving(true);
    try {
      const createdAlert = await alertsApi.createAlert(token, {
        symbol: selectedSymbol,
        targetPrice: nextTargetPrice,
        direction,
      });

      setAlerts((previous) => [createdAlert, ...previous]);
    } finally {
      setIsSaving(false);
    }
  };

  const removeAlert = async (alertId: string) => {
    if (!token) {
      onRequireAuth(`Sign in to manage alerts for ${selectedSymbol}.`);
      return;
    }

    await alertsApi.deleteAlert(token, alertId);
    setAlerts((previous) => previous.filter((alert) => alert.id !== alertId));
  };

  return (
    <section className="alert-panel">
      <div className="alert-panel-header">
        <div>
          <span className="alert-panel-eyebrow">Price alerts</span>
          <h3>{selectedSymbol}</h3>
        </div>
        <BellRing size={18} />
      </div>

      <div className="alert-quick-actions">
        <button
          className="alert-quick-action"
          type="button"
          onClick={() => {
            setDirection('above');
            setTargetPrice((currentPrice * 1.002).toFixed(5));
          }}
        >
          Above market
        </button>
        <button
          className="alert-quick-action"
          type="button"
          onClick={() => {
            setDirection('below');
            setTargetPrice((currentPrice * 0.998).toFixed(5));
          }}
        >
          Below market
        </button>
      </div>

      <div className="alert-form-grid">
        <label className="form-label-stack">
          <span>Direction</span>
          <select
            className="form-input"
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value as AlertDirection)
            }
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </label>

        <label className="form-label-stack">
          <span>Target</span>
          <input
            className="form-input"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            type="number"
            min="0"
            step="0.00001"
          />
        </label>
      </div>

      <button
        className="alert-submit"
        type="button"
        onClick={createAlert}
        disabled={isSaving}
      >
        <Bell size={14} /> {isSaving ? 'Saving...' : 'Create alert'}
      </button>

      <div className="alert-list">
        {!isAuthenticated && (
          <div className="alert-empty-state">
            Sign in to save alerts and receive personal notifications.
          </div>
        )}
        {isLoading && (
          <div className="alert-empty-state">Loading alerts...</div>
        )}
        {isAuthenticated && !isLoading && symbolAlerts.length === 0 && (
          <div className="alert-empty-state">
            No alerts configured for this symbol.
          </div>
        )}
        {!isLoading &&
          symbolAlerts.map((alert) => (
            <div className="alert-card" key={alert.id}>
              <div>
                <div className="alert-card-title">
                  {alert.direction === 'above'
                    ? 'Breakout alert'
                    : 'Pullback alert'}
                </div>
                <div className="alert-card-copy">
                  Trigger {alert.direction} {formatPrice(alert.targetPrice)}
                </div>
              </div>
              <div className="alert-card-actions">
                <span
                  className={`alert-status ${alert.triggeredAt ? 'is-triggered' : 'is-active'}`}
                >
                  {alert.triggeredAt ? 'Triggered' : 'Active'}
                </span>
                <button
                  className="alert-delete"
                  type="button"
                  onClick={() => removeAlert(alert.id)}
                  aria-label={`Delete alert ${alert.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
};
