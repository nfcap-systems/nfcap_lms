import { ensureTestDatabase } from '../../setup/db-infra';

export default function globalSetup() {
  ensureTestDatabase();
}
