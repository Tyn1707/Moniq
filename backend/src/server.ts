import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`FinanceTrack API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received — shutting down.`);
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
  // Don't hang forever if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
