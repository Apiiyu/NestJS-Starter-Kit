import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * @description Adds uniqueness on `email` and `username` — but only across rows that
 * are still alive.
 *
 * A plain `UNIQUE` constraint cannot coexist with soft delete: once a user is deleted
 * their row stays in the table, so the address they used is burned forever and nobody
 * can ever register with it again. A partial index scoped to `"deletedAt" IS NULL`
 * enforces the rule where it matters and ignores the tombstones.
 *
 * The index names are mirrored by `USERS_UNIQUE_INDEX` in `users.entity.ts`, which
 * `UsersService` matches against Postgres error 23505 to tell a taken email apart from
 * a taken username. Renaming an index here without updating that constant silently
 * downgrades those conflicts to a generic 400.
 *
 * This migration fails loudly if the table already holds duplicate live rows. That is
 * intended — the duplicates have to be resolved by hand, and keeping them would leave
 * `findOneByEmail` returning a non-deterministic row.
 */
export class UsersUniqueActiveIndexes1785853773164 implements MigrationInterface {
  name = 'UsersUniqueActiveIndexes1785853773164';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email_active" ON "users" ("email") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_username_active" ON "users" ("username") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_users_username_active"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_email_active"`);
  }
}
