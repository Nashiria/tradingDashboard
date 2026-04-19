import { MockUserCredentials } from '../domain/models/Auth';

export const MOCK_USERS: readonly MockUserCredentials[] = [
  {
    id: 'demo-trader',
    email: 'demo@mockbank.com',
    password: 'demo123',
    name: 'Demo Trader',
    role: 'demo',
  },
  {
    id: 'markets-ops',
    email: 'trader@mockbank.com',
    password: 'trader123',
    name: 'Markets Ops',
    role: 'trader',
  },
];
