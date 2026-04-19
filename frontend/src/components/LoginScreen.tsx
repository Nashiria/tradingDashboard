import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  title?: string;
  copy?: string;
  submitLabel?: string;
  onClose?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  title = 'Sign in to your trading workspace',
  copy = 'Mocked authentication is wired end-to-end so alerts and personalized sessions behave like a real platform.',
  submitLabel = 'Enter Dashboard',
  onClose,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@mockbank.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      onClose?.();
    } catch {
      setError('Sign-in failed. Try the demo credentials shown below.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card-badge">
          <TrendingUp size={16} /> MockBank Live
        </div>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-copy">{copy}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-input"
              type="email"
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input"
              type="password"
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-actions-row">
            <button
              className="auth-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : submitLabel}
            </button>
            {onClose && (
              <button
                className="auth-secondary-action"
                type="button"
                onClick={onClose}
              >
                Continue as guest
              </button>
            )}
          </div>
        </form>

        <div className="auth-credentials-grid">
          <div>
            <strong>Demo</strong>
            <span>`demo@mockbank.com` / `demo123`</span>
          </div>
          <div>
            <strong>Trader</strong>
            <span>`trader@mockbank.com` / `trader123`</span>
          </div>
        </div>
      </div>
    </div>
  );
};
