import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, req, res, next) {
  logger.error(err.message, err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
