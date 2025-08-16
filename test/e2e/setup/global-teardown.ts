// test/e2e/setup/global-teardown.ts
import type { StartedTestContainer } from 'testcontainers';

export default async function globalTeardown() {
  console.log('🛑 Stopping PostgreSQL containers...');
  const containers: Record<string, StartedTestContainer> = (global as any).__TEST_CONTAINERS__ || {};

  for (const [name, container] of Object.entries(containers)) {
    console.log(`🛑 Stopping ${name} DB...`);
    await container.stop();
  }

  console.log('✅ All containers stopped.');
}