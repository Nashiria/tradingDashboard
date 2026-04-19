import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../src/business/services/AuthService';
import { MockUserCredentials } from '../src/domain/models/Auth';

const USERS: readonly MockUserCredentials[] = [
  {
    id: 'user-1',
    email: 'demo@mockbank.com',
    password: 'demo123',
    name: 'Demo Trader',
    role: 'demo',
  },
];

test('AuthService creates verifiable sessions with case-insensitive email matching', () => {
  const service = new AuthService(USERS, 'test-secret');
  const session = service.login('DEMO@mockbank.com', 'demo123');

  assert.ok(session);
  assert.equal(typeof session.token, 'string');
  assert.equal(session.expiresAt > Date.now(), true);
  assert.deepEqual(session.user, {
    id: 'user-1',
    email: 'demo@mockbank.com',
    name: 'Demo Trader',
    role: 'demo',
  });
  assert.deepEqual(service.verifyToken(session.token), session.user);
});

test('AuthService rejects invalid credentials', () => {
  const service = new AuthService(USERS, 'test-secret');

  assert.equal(service.login('demo@mockbank.com', 'wrong-password'), null);
  assert.equal(service.login('unknown@mockbank.com', 'demo123'), null);
});

test('AuthService rejects malformed or tampered tokens', () => {
  const service = new AuthService(USERS, 'test-secret');
  const session = service.login('demo@mockbank.com', 'demo123');

  assert.ok(session);
  assert.equal(service.verifyToken('not-a-token'), null);
  assert.equal(service.verifyToken(`${session.token}tampered`), null);

  const [payload] = session.token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      sub: 'user-2',
      email: 'attacker@example.com',
      name: 'Attacker',
      role: 'admin',
      exp: Date.now() + 1000,
    }),
    'utf8',
  ).toString('base64url');

  assert.equal(
    service.verifyToken(`${tamperedPayload}.${session.token.split('.')[1]}`),
    null,
  );
  assert.equal(service.verifyToken(`${payload}.short`), null);
});

test('AuthService rejects expired tokens', () => {
  const service = new AuthService(USERS, 'test-secret');
  const originalNow = Date.now;

  try {
    Date.now = () => 1_000;
    const session = service.login('demo@mockbank.com', 'demo123');
    assert.ok(session);

    Date.now = () => session.expiresAt + 1;
    assert.equal(service.verifyToken(session.token), null);
  } finally {
    Date.now = originalNow;
  }
});
