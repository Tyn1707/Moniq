import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env';

/**
 * Single shared Prisma client. Re-used across hot reloads in development so we
 * don't exhaust database connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['error', 'warn'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
