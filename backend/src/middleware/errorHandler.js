import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Map common PostgreSQL errors safely
  if (err.code === '23505') {
    statusCode = 409;
    message = 'A record with this unique value already exists';
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record does not exist or cannot be removed while in use';
  } else if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid identifier or input format';
  } else if (err.code === '23514') {
    statusCode = 400;
    message = 'Input violates database validation constraints';
  }

  if (statusCode >= 500 && env.isProd) {
    message = 'An unexpected server error occurred';
    details = null;
  }

  if (!env.isTest && statusCode >= 500) {
    console.error('[ServerError]', err);
  }

  const payload = {
    success: false,
    message,
  };
  if (details) {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
}

