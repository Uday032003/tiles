import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { findUserById } from '../repositories/usersRepository.js';

export function createAuthenticateMiddleware(lookupUserById = findUserById) {
  return async function authenticate(req, _res, next) {
    try {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        return next(ApiError.unauthorized('Missing or invalid authorization token'));
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        return next(ApiError.unauthorized('Authentication token is empty'));
      }

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch {
        return next(ApiError.unauthorized('Invalid or expired authentication token'));
      }

      const user = await lookupUserById(decoded.sub);
      if (!user || !user.is_active) {
        return next(ApiError.unauthorized('User account is inactive or no longer exists'));
      }

      req.user = user;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export const authenticate = createAuthenticateMiddleware();

export function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient role permissions'));
    }
    return next();
  };
}

