-- Partner Staff's dedicated case views (PTN01-Roster, PTN02-LearnerDetail — the design-system
-- migration's known gap, now being fixed) need a real "Add a note" follow-up log that isn't an
-- outbound email or call. Adding NOTE to the existing CommunicationChannel enum reuses the
-- WioaCommunication model (already the real log for EMAIL/CALL) instead of a new table.

ALTER TYPE "CommunicationChannel" ADD VALUE 'NOTE';
