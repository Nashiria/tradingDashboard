import { Response } from 'express';

export const API_VERSION = 'v1';

export interface ApiErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiSuccessResponse<TData, TMeta = undefined> {
  version: typeof API_VERSION;
  data: TData;
  meta?: TMeta;
}

export interface ApiErrorResponse {
  version: typeof API_VERSION;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export function sendSuccess<TData, TMeta = undefined>(
  res: Response,
  status: number,
  data: TData,
  meta?: TMeta,
): void {
  const body: ApiSuccessResponse<TData, TMeta> = {
    version: API_VERSION,
    data,
    ...(meta === undefined ? {} : { meta }),
  };

  res.setHeader('X-API-Version', API_VERSION);
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: ApiErrorDetail[],
): void {
  const body: ApiErrorResponse = {
    version: API_VERSION,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };

  res.setHeader('X-API-Version', API_VERSION);
  res.status(status).json(body);
}
