import { and, isNull, type SQL, type SQLWrapper } from "drizzle-orm";

/**
 * Soft-delete filter for normal reads and writes.
 *
 * ADR 0001: soft-deleted rows are excluded by this helper, not by an
 * inline `isNull(table.deletedAt)` in a route. New queries that should
 * hide deleted rows call `notDeleted` or `whereLive`.
 *
 * Leave the helper off only when the query must see deleted rows:
 * authorization lookups that branch on `deletedAt`, restoring a
 * candidate by email, and the application duplicate check (the unique
 * constraint still covers soft-deleted applications).
 */
type SoftDeletable = {
  deletedAt: SQLWrapper;
};

export function notDeleted(table: SoftDeletable): SQL {
  return isNull(table.deletedAt);
}

export function whereLive(
  table: SoftDeletable,
  ...filters: (SQLWrapper | undefined)[]
): SQL | undefined {
  return and(notDeleted(table), ...filters);
}
