// Class Transformer
import { Exclude } from 'class-transformer';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Every audit timestamp is a real `timestamptz`, never a Unix epoch number, and
 * every one is maintained by TypeORM rather than by entity lifecycle hooks.
 *
 * Two concrete reasons, both of which bit the previous bigint design:
 *
 * 1. `@BeforeUpdate` only fires when `save()` is called on an entity instance that
 *    was loaded first. It does NOT fire for `repository.update()` or for
 *    `QueryBuilder.update()`, so those paths silently left `updatedAt` stale.
 *    `@UpdateDateColumn` is applied at the persistence layer and covers them.
 * 2. Unix-second precision made the default `createdAt|DESC` sort
 *    (see `ListOptionDto`) tie for rows written inside the same second, which
 *    makes keyset-free pagination non-deterministic — rows can repeat across
 *    pages or vanish. Microsecond precision removes that class of bug.
 *
 * These columns keep explicit camelCase names, so raw SQL must quote them
 * (`users."deletedAt"`) — `SnakeNamingStrategy` does not apply to them.
 */
export abstract class AppBaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  /*
   * Create, Update and Delete Date Columns
   */
  @ApiProperty()
  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamptz',
    update: false,
  })
  public createdAt!: Date;

  @ApiProperty()
  @Column({
    name: 'createdBy',
    type: 'varchar',
    nullable: true,
  })
  public createdBy!: string;

  @Column({
    name: 'createdById',
    type: 'uuid',
    nullable: true,
  })
  @Exclude()
  public createdById!: string;

  @ApiProperty()
  @UpdateDateColumn({
    name: 'updatedAt',
    type: 'timestamptz',
  })
  public updatedAt!: Date;

  @ApiProperty()
  @Column({
    name: 'updatedBy',
    type: 'varchar',
    nullable: true,
  })
  public updatedBy!: string;

  @Column({
    name: 'updatedById',
    type: 'uuid',
    nullable: true,
  })
  @Exclude()
  public updatedById!: string;

  /**
   * @description Soft-delete marker. Declared as `@DeleteDateColumn` so TypeORM's
   * native soft-delete APIs work: `softDelete()`, `restore()`, and the implicit
   * `deletedAt IS NULL` filter on every find and query-builder call.
   *
   * Because that filter is applied automatically, any query that needs to SEE
   * soft-deleted rows must opt in with `.withDeleted()` / `withDeleted: true`.
   */
  @ApiProperty({ nullable: true, type: String })
  @DeleteDateColumn({
    name: 'deletedAt',
    type: 'timestamptz',
    nullable: true,
  })
  public deletedAt: Date | null = null;

  @ApiProperty()
  @Column({
    name: 'deletedBy',
    type: 'varchar',
    nullable: true,
  })
  public deletedBy!: string;

  @Column({
    name: 'deletedById',
    type: 'uuid',
    nullable: true,
  })
  @Exclude()
  public deletedById!: string;
}
