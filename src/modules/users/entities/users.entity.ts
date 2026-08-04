// Class Transformer
import { Exclude } from 'class-transformer';

// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, Index } from 'typeorm';

/**
 * @description Names of the partial unique indexes created by
 * `1785853773164-UsersUniqueActiveIndexes`.
 *
 * Postgres reports the violated index by name in error 23505 and nothing else, so
 * these strings are the only way `UsersService` can tell "email taken" apart from
 * "username taken". They must stay byte-identical to the names in that migration.
 */
export const USERS_UNIQUE_INDEX = {
  EMAIL: 'UQ_users_email_active',
  USERNAME: 'UQ_users_username_active',
} as const;

/**
 * The uniqueness predicates are scoped to live rows. `@DeleteDateColumn` keeps
 * soft-deleted users in the table, and an unscoped `UNIQUE` would let one deleted
 * account permanently reserve an email address nobody can ever reclaim.
 */
@Entity('users')
@Index(USERS_UNIQUE_INDEX.EMAIL, ['email'], { unique: true, where: '"deletedAt" IS NULL' })
@Index(USERS_UNIQUE_INDEX.USERNAME, ['username'], { unique: true, where: '"deletedAt" IS NULL' })
export class UsersEntity extends AppBaseEntity {
  @ApiProperty()
  @Column({ type: 'varchar', length: 100 })
  public username!: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 100 })
  public email!: string;

  @Exclude()
  @Column({ type: 'varchar', length: 100 })
  public password!: string;
}
