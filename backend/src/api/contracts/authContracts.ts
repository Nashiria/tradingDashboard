import { ApiErrorDetail } from './apiResponse';

export interface LoginRequestBody {
  email: string;
  password: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseLoginRequest(body: unknown): {
  value?: LoginRequestBody;
  errors?: ApiErrorDetail[];
} {
  const errors: ApiErrorDetail[] = [];
  const record =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const email =
    typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const password = typeof record.password === 'string' ? record.password : '';

  if (!email) {
    errors.push({
      field: 'email',
      message: 'Email is required.',
      value: record.email,
    });
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({
      field: 'email',
      message: 'Email must be a valid address.',
      value: record.email,
    });
  }

  if (!password.trim()) {
    errors.push({
      field: 'password',
      message: 'Password is required.',
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    value: {
      email,
      password,
    },
  };
}
