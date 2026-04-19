import crypto from 'crypto';
import {
  AuthSession,
  AuthUser,
  MockUserCredentials,
} from '../../domain/models/Auth';

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: AuthUser['role'];
  exp: number;
}

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

const toBase64Url = (value: string) =>
  Buffer.from(value, 'utf8').toString('base64url');
const fromBase64Url = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

export class AuthService {
  constructor(
    private readonly users: readonly MockUserCredentials[],
    private readonly secret: string,
  ) {}

  public login(email: string, password: string): AuthSession | null {
    const user = this.users.find(
      (candidate) =>
        candidate.email.toLowerCase() === email.toLowerCase() &&
        candidate.password === password,
    );

    if (!user) {
      return null;
    }

    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const token = this.createToken(user, expiresAt);

    return {
      token,
      expiresAt,
      user: this.toAuthUser(user),
    };
  }

  public verifyToken(token: string): AuthUser | null {
    const [payloadEncoded, signature] = token.split('.');

    if (!payloadEncoded || !signature) {
      return null;
    }

    const expectedSignature = this.sign(payloadEncoded);
    if (signature.length !== expectedSignature.length) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(fromBase64Url(payloadEncoded)) as TokenPayload;

      if (payload.exp < Date.now()) {
        return null;
      }

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  private createToken(user: MockUserCredentials, expiresAt: number): string {
    const payloadEncoded = toBase64Url(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: expiresAt,
      } satisfies TokenPayload),
    );

    return `${payloadEncoded}.${this.sign(payloadEncoded)}`;
  }

  private sign(value: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(value)
      .digest('base64url');
  }

  private toAuthUser(user: MockUserCredentials): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
