import { ErrorRequestHandler, RequestHandler } from 'express';
import { sendError } from '../contracts/apiResponse';
import { ApiHttpError } from '../errors/ApiHttpError';

export const notFoundHandler: RequestHandler = (_req, res) => {
  sendError(res, 404, 'ROUTE_NOT_FOUND', 'Requested resource was not found.');
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ApiHttpError) {
    sendError(res, error.status, error.code, error.message, error.details);
    return;
  }

  console.error('Unhandled API error', {
    method: req.method,
    path: req.originalUrl,
    error,
  });

  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'Internal server error occurred.',
  );
};
