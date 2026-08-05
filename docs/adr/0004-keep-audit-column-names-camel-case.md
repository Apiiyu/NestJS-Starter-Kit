# ADR 0004: Keep audit column names camelCase

- Status: Accepted
- Date: 2026-08-05
- Deciders: Project maintainers

## Context

`SnakeNamingStrategy` converts ordinary entity properties to snake_case. The inherited audit
columns in `AppBaseEntity` predate that convention and explicitly name camelCase columns such
as `createdAt`, `updatedById`, and `deletedAt`. The initial migration has already made those
names part of the database contract.

Changing them now would require a migration across every entity table and would create a
high-risk compatibility change for little operational benefit.

## Decision

Keep inherited audit column names explicitly camelCase. Allow the naming strategy to map
feature-specific columns and relation join columns to snake_case unless an entity explicitly
overrides a name.

Raw SQL must quote camelCase audit identifiers, for example `users."deletedAt"`. Queries that
need soft-deleted rows must also opt in through TypeORM's `withDeleted` behavior; naming does
not change soft-delete visibility.

## Consequences

### Positive

- Existing migrations and deployed schemas remain compatible.
- Every entity inherits the same stable audit-column contract.
- The convention is explicit rather than depending on naming-strategy side effects.

### Negative

- The schema intentionally contains both camelCase audit columns and snake_case feature
  columns.
- Raw SQL authors must remember quoting and cannot infer every identifier from the global
  naming strategy.

## Alternatives considered

- **Rename audit columns to snake_case** — More uniform, but forces a wide migration and
  breaks consumers for a cosmetic gain.
- **Disable `SnakeNamingStrategy`** — Avoids mixed naming only by changing every ordinary
  column and relation instead.

## References

- `src/common/entities/base.entity.ts`
- `src/database/postgres/snake-naming.strategy.ts`
- `src/database/postgres/migrations/1785834704702-InitialSchema.ts`
