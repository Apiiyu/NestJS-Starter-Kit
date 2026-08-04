import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * @description Gives every user a role, stored as a native Postgres enum.
 *
 * A `varchar` with a CHECK constraint would have been easier to evolve, and that is
 * exactly the trade being made against it: with a real type the database refuses an
 * unknown role outright, rather than trusting every writer — seeders and raw SQL
 * included — to have validated the string first.
 *
 * The cost is paid later. Adding a label needs `ALTER TYPE ... ADD VALUE`, which
 * Postgres will not run in the same transaction as statements that use the new value,
 * so each new role belongs in its own migration. Removing a label means recreating the
 * type and rewriting every column that references it. `USER_ROLE` is append-only for
 * that reason.
 *
 * The label order here must match `Object.values(USER_ROLE)` in `role.constant.ts`.
 * TypeORM compares the two sets when diffing the schema; a mismatch shows up as
 * permanent drift in `schema:log` and an endless rename loop in `migration:generate`.
 *
 * Existing rows become `user` via the column default — the conservative direction. No
 * account gains privileges by running this migration; the first admin has to be
 * promoted deliberately.
 */
export class AddUserRole1785855054296 implements MigrationInterface {
  name = 'AddUserRole1785855054296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'user')`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "public"."user_role_enum" NOT NULL DEFAULT 'user'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}
