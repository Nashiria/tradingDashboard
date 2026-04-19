import { ApiErrorDetail } from '../contracts/apiResponse';

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}
