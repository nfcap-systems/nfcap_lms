/** No-SSN Rule & PII Boundary (docs/build/PHASE_1_PII_BOUNDARY.md). Mirrors the DB-level
 * `app_contains_ssn_pattern` CHECK constraints (prisma/migrations/20261105140000_no_ssn_check_constraints)
 * so free-text input gets a clear validation error instead of a raw constraint-violation message
 * — the DB constraint is the real backstop, this is just the user-facing half of it.
 * Matches ###-##-####, ### ## ####, or ######### (9 bare digits) with word boundaries. */
const SSN_PATTERN = /\b\d{3}[- .]?\d{2}[- .]?\d{4}\b/;

export function containsSsnPattern(value: string): boolean {
  return SSN_PATTERN.test(value);
}
