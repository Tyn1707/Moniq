import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Builds a throwaway database for the suite. Running against a dedicated
 * `test.db` (never `dev.db`) means the tests can reset state freely without
 * destroying local development data.
 */
export const setup = (): void => {
  const backendRoot = path.resolve(__dirname, '..', '..');
  const testDbPath = path.join(backendRoot, 'prisma', 'test.db');

  for (const file of [testDbPath, `${testDbPath}-journal`]) {
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  // Resolve Prisma's CLI entry point and run it with the current Node binary.
  // Spawning `npx.cmd` would need a shell, which recent Node refuses to do
  // implicitly on Windows.
  const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(prismaCli)) {
    throw new Error(`Prisma CLI not found at ${prismaCli}. Run "npm install" first.`);
  }

  execFileSync(
    process.execPath,
    [prismaCli, 'db', 'push', '--skip-generate', '--force-reset'],
    {
      cwd: backendRoot,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: 'file:./test.db', NODE_ENV: 'test' },
    },
  );
};
