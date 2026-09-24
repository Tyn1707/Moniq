import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * A request that has passed through `requireAuth`. Using a distinct type
 * (rather than a global `Request.user?`) means the compiler — not a runtime
 * check — guarantees `user` is present inside protected handlers.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
