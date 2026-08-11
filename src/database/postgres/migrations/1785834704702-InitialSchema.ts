// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * @description Creates the initial schema: the `users` table and the extension its UUID
 * primary keys depend on.
 */
export class InitialSchema1785834704702 implements MigrationInterface {
  name = 'InitialSchema1785834704702';

  /**
   * @description Applies the initial schema.
   *
   * @param queryRunner The connection the migration runner supplies.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" character varying, "createdById" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" character varying, "updatedById" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" character varying, "deletedById" uuid, "username" character varying(100) NOT NULL, "email" character varying(100) NOT NULL, "password" character varying(100) NOT NULL, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
  }

  /**
   * @description Drops the initial schema. Destructive — it removes the table and its rows.
   *
   * @param queryRunner The connection the migration runner supplies.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
