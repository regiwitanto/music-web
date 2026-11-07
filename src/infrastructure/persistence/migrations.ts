import type { Transaction } from 'dexie'

/**
 * Schema versions after the first (002 research R8; FR-020, FR-021). Version 1 is declared in
 * `database.ts`; every later change is one entry here, with the table definitions it changes and
 * an upgrade that carries existing data over. Each entry needs a fixture test that opens data
 * from every earlier version and keeps every record.
 *
 * No destructive upgrade may ship until the listener can export their data first (feature 010):
 * `findDestructive` is checked by a unit test that fails if the real registry has any.
 */

export interface Migration {
  /** The schema version this entry creates. The registry starts at 2 and increases strictly. */
  version: number
  /** True if the upgrade removes or irreversibly transforms data (FR-021). Not allowed yet. */
  destructive: boolean
  /** Only the tables this version adds or changes (Dexie definitions; `null` deletes a table). */
  stores: Record<string, string | null>
  upgrade(transaction: Transaction): Promise<void> | void
}

/** Empty: version 1 is the first schema. */
export const MIGRATIONS: readonly Migration[] = []

export function findDestructive(migrations: readonly Migration[]): Migration[] {
  return migrations.filter((migration) => migration.destructive)
}
