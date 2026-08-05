# ADR 0001: Use TypeORM with PostgreSQL

- Status: Accepted
- Date: 2026-08-05
- Deciders: Project maintainers

## Context

The starter kit needs transactional relational storage, migrations that can build an empty
database, and a persistence API that fits Nest dependency injection. The runtime and CLI
must observe the same entities, migrations, and naming strategy; an earlier split left the
CLI unable to generate meaningful migrations.

## Decision

Use PostgreSQL as the database and TypeORM's Data Mapper APIs as the persistence layer.
Repositories are injected into services through `TypeOrmModule.forFeature`; controllers do
not access TypeORM or database modules directly.

Keep runtime configuration in `PostgresDatabaseProviderModule` and CLI configuration in
`postgres-data-source.ts`. Their entity, migration, and naming-strategy lists are
deliberately duplicated because the TypeORM CLI loads the data source without booting Nest.
Schema evolution always ships as a migration; `synchronize` remains disabled by default.

## Consequences

### Positive

- Migrations can generate, run, show, and revert against a clean PostgreSQL database.
- Services use repository abstractions while HTTP controllers stay persistence-agnostic.
- Native PostgreSQL constraints remain the final authority for uniqueness and integrity.

### Negative

- Runtime and CLI data-source lists must be kept in sync.
- TypeORM-specific decorators and migration APIs couple the persistence layer to TypeORM.
- Native PostgreSQL features such as partial indexes and enums may require handwritten SQL.

## Alternatives considered

- **Prisma** — A valid choice, but replacing the established entity and repository model
  would add migration risk without solving a current requirement.
- **Raw `pg` queries** — Offers full SQL control but gives up the existing Nest integration,
  entity metadata, and repository test seams.
- **`synchronize: true`** — Convenient locally, but unsafe and unauditable for deployed
  schema evolution.

## References

- `src/database/postgres/postgres-data-source.ts`
- `src/database/postgres/postgres-provider.module.ts`
- `src/database/postgres/migrations/`
