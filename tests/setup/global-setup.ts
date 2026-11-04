import { ensureTestDatabase } from './db-infra';

export async function setup() {
  ensureTestDatabase();
}

export async function teardown() {
  // Local runs intentionally leave the container up for the next run; CI's service container is
  // torn down by the runner itself. Nothing to do here.
}
