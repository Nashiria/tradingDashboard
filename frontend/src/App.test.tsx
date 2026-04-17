import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

jest.mock('./pages/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-mock">Dashboard</div>
}));

test('renders App component without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});
