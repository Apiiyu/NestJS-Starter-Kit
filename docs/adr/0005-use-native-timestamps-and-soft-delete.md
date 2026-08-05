# ADR 0005: Use native timestamps and soft delete

- Status: Accepted
- Date: 2026-08-05
- Deciders: Project maintainers

## Context

The original base entity stored audit time as bigint Unix seconds and declared `deletedAt`
as an ordinary column. That design had two correctness failures:

- TypeORM could not recognize the column as a soft-delete marker, so `softDelete`, `restore`,
  and `withDeleted` did not provide their documented behavior.
- Entity hooks did not run for `repository.update` or query-builder updates, and one-second
  precision produced tied default sort keys for rows created in the same second.

The previous documentation called those values Unix milliseconds, which did not match the
implementation either.

## Decision

Store `createdAt`, `updatedAt`, and `deletedAt` as PostgreSQL `timestamptz`. Maintain them with
TypeORM's `@CreateDateColumn`, `@UpdateDateColumn`, and `@DeleteDateColumn` decorators.

Use native TypeORM soft deletion. Normal repository queries exclude deleted rows. Code that
must inspect or restore deleted data must state that intent with `.withDeleted()` or
`withDeleted: true`. Audit timestamps are represented as JavaScript `Date` values at the
application boundary, not Unix numbers.

## Consequences

### Positive

- `softDelete`, `restore`, and default deleted-row filtering work consistently.
- Persistence-layer timestamp handling covers `save`, `update`, and query-builder paths.
- Microsecond database precision prevents avoidable pagination ties.

### Negative

- This was a breaking schema change from the original bigint representation.
- Queries can silently miss deleted rows if a restore or audit path forgets `withDeleted`.
- API consumers receive serialized date-time strings rather than epoch numbers.

## Alternatives considered

- **Keep manual bigint Unix seconds** — Preserves the old type but retains stale update
  timestamps, low precision, and manual deleted-row filtering.
- **Use Unix milliseconds** — Improves precision but still bypasses TypeORM's native
  timestamp and soft-delete semantics.
- **Hard delete only** — Simpler querying, but removes the restore and audit behavior the
  starter kit intentionally supports.

## References

- `src/common/entities/base.entity.ts`
- `src/modules/users/services/users.service.ts`
- `src/database/postgres/migrations/1785834704702-InitialSchema.ts`
