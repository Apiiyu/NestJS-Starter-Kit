/**
 * @description The roles a user can hold.
 *
 * Backed by a native Postgres enum (`user_role_enum`), so these values are part of
 * the database schema, not just of the application. Two consequences worth knowing
 * before editing this file:
 *
 * - Adding a value needs a migration running `ALTER TYPE ... ADD VALUE`, which in
 *   Postgres cannot run inside a transaction block alongside statements that use the
 *   new value. Give it its own migration.
 * - Removing a value is effectively impossible without recreating the type and
 *   rewriting every column that uses it. Treat this list as append-only.
 *
 * Declared as a frozen object rather than a TypeScript `enum` so the runtime value is
 * a plain string — which is what Postgres stores and what lands in the JWT `role`
 * claim, with no reverse-mapping object to leak into serialised output.
 */
export const USER_ROLE = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/**
 * @description Every role as a plain array, in the order the Postgres enum declares
 * its labels. `UsersEntity` hands this to TypeORM's `enum` column option, so the order
 * has to match the migration or `schema:log` reports permanent drift.
 */
export const USER_ROLES: readonly UserRole[] = Object.values(USER_ROLE);
