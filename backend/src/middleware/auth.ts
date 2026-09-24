import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';
import { AUTH_COOKIE_NAME } from '../utils/constants';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types/request';

interface TokenPayload {
  sub: string;
  email: string;
}

export const signAuthToken = (user: AuthenticatedUser): string => {
  const payload: TokenPayload = { sub: user.id, email: user.email };
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

/**
 * The token lives in an httpOnly cookie rather than localStorage so that XSS
 * cannot exfiltrate it. `sameSite: 'strict'` is our CSRF defence: the browser
 * will not attach the cookie to cross-site requests.
 */
const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
};

export const clearAuthCookie = (res: Response): void => {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
};

const readToken = (req: Request): string | null => {
  const fromCookie = (req.cookies as Record<string, string | undefined> | undefined)?.[AUTH_COOKIE_NAME];
  if (fromCookie) return fromCookie;

  // Bearer fallback keeps non-browser clients (tests, mobile) usable.
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim() || null;

  return null;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = readToken(req);
  if (!token) {
    next(AppError.unauthorized());
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    (req as AuthenticatedRequest).user = { id: decoded.sub, email: decoded.email };
    next();
  } catch {
    // Expired or tampered token — deliberately no detail leaked to the client.
    next(AppError.unauthorized('Your session has expired. Please sign in again.'));
  }
};
