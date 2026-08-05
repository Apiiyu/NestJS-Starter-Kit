// Entities
import { UsersEntity } from '../../users';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * @description One issued refresh token.
 *
 * Deliberately does **not** extend `AppBaseEntity`, for two reasons.
 *
 * `@DeleteDateColumn` would make TypeORM append `deletedAt IS NULL` to every query
 * against this table. Reuse detection depends on being able to see a token *after* it
 * has been spent — that is the whole signal — so a table that hides rows by default is
 * exactly the wrong shape. Revocation here is an explicit `revokedAt` timestamp and
 * must never be expressed as `softDelete()`.
 *
 * The `createdBy` / `updatedBy` / `deletedBy` audit trio is also meaningless for a row
 * only ever written by the auth flow on behalf of one user, already named by `userId`.
 */
@Entity('refresh_tokens')
@Index('UQ_refresh_tokens_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_refresh_tokens_user', ['userId'])
@Index('IDX_refresh_tokens_family', ['familyId'])
export class RefreshTokenEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  /**
   * SHA-256 of the token, hex encoded — never the token itself.
   *
   * A refresh token is a bearer credential with a seven-day life, so a leaked database
   * dump of plaintext tokens is a leaked set of live sessions. A fast digest is enough
   * here, unlike a password: lookup is by exact value, and the input is 32 bytes of
   * CSPRNG output, so there is no dictionary to run against it.
   */
  @Column({ name: 'tokenHash', type: 'char', length: 64 })
  public tokenHash!: string;

  @Column({ name: 'userId', type: 'uuid' })
  public userId!: string;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  public user!: UsersEntity;

  /**
   * Every token descended from a single login shares this id.
   *
   * Rotation makes a chain: each refresh mints a successor and revokes its
   * predecessor. If a predecessor is ever presented again, two parties hold tokens
   * from the same chain — which only happens after a theft. The response is to kill
   * the whole family rather than just the replayed link, because there is no way to
   * tell which of the two holders is the legitimate one.
   */
  @Column({ name: 'familyId', type: 'uuid' })
  public familyId!: string;

  @Column({ name: 'expiresAt', type: 'timestamptz' })
  public expiresAt!: Date;

  /**
   * Set when the token is spent, or when its whole family is killed. `NULL` means
   * live, and the rotation query keys off exactly that: `WHERE "revokedAt" IS NULL`
   * is what makes spending a token a compare-and-swap rather than a read-then-write.
   */
  @Column({ name: 'revokedAt', type: 'timestamptz', nullable: true })
  public revokedAt: Date | null = null;

  /** The successor minted when this token was spent. Kept for forensics. */
  @Column({ name: 'replacedById', type: 'uuid', nullable: true })
  public replacedById: string | null = null;

  @ManyToOne(() => RefreshTokenEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'replacedById' })
  public replacedBy!: RefreshTokenEntity | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  public createdAt!: Date;
}
