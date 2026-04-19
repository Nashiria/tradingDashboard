import assert from 'node:assert/strict';
import test from 'node:test';
import { Request, Response } from 'express';
import { AuthController } from '../src/api/controllers/AuthController';
import { AuthenticatedRequest } from '../src/api/types/auth';
import { AuthSession, AuthUser } from '../src/domain/models/Auth';

class AuthServiceStub {
  public loginCalls: Array<{ email: string; password: string }> = [];

  constructor(private readonly session: AuthSession | null = null) {}

  login(email: string, password: string): AuthSession | null {
    this.loginCalls.push({ email, password });
    return this.session;
  }
}

function createResponseMock(): Response & {
  headers: Record<string, string>;
  statusCode: number;
  body: unknown;
} {
  const response = {
    headers: {} as Record<string, string>,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    cookie() {
      return this;
    },
    clearCookie() {
      return this;
    },
  };

  return response as unknown as Response & {
    headers: Record<string, string>;
    statusCode: number;
    body: unknown;
  };
}

test('AuthController validates login payload shape', async () => {
  const controller = new AuthController(new AuthServiceStub() as never);
  const res = createResponseMock();

  await controller.login(
    { body: { email: 'demo@mockbank.com' } } as Request,
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    version: 'v1',
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Email and password are required.',
    },
  });
});

test('AuthController rejects bad credentials', async () => {
  const authService = new AuthServiceStub(null);
  const controller = new AuthController(authService as never);
  const res = createResponseMock();

  await controller.login(
    { body: { email: 'demo@mockbank.com', password: 'bad' } } as Request,
    res,
  );

  assert.deepEqual(authService.loginCalls, [
    { email: 'demo@mockbank.com', password: 'bad' },
  ]);
  assert.equal(res.statusCode, 401);
});

test('AuthController returns a session on successful login', async () => {
  const user: AuthUser = {
    id: 'user-1',
    email: 'demo@mockbank.com',
    name: 'Demo Trader',
    role: 'demo',
  };
  const session: AuthSession = { token: 'token', expiresAt: 1234, user };
  const controller = new AuthController(new AuthServiceStub(session) as never);
  const res = createResponseMock();

  await controller.login(
    { body: { email: 'demo@mockbank.com', password: 'demo123' } } as Request,
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    version: 'v1',
    data: session,
  });
});

test('AuthController returns the authenticated user payload', async () => {
  const controller = new AuthController(new AuthServiceStub() as never);
  const authenticatedRes = createResponseMock();
  const user: AuthUser = {
    id: 'user-1',
    email: 'demo@mockbank.com',
    name: 'Demo Trader',
    role: 'demo',
  };

  await controller.me(
    { authUser: user } as AuthenticatedRequest,
    authenticatedRes,
  );

  assert.equal(authenticatedRes.statusCode, 200);
  assert.deepEqual(authenticatedRes.body, {
    version: 'v1',
    data: user,
  });
});
