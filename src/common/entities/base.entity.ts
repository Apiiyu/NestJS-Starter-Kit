// Class Transformer
import { Exclude } from 'class-transformer';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, PrimaryGeneratedColumn, BeforeUpdate, BeforeInsert } from 'typeorm';

export abstract class AppBaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  /*
   * Create, Update and Delete Date Columns
   */
  @ApiProperty()
  @Column({
    name: 'createdAt',
    type: 'bigint',
    update: false,
    nullable: true,
  })
  public createdAt!: number;

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
  @Column({
    name: 'updatedAt',
    type: 'bigint',
    nullable: true,
  })
  public updatedAt!: number;

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

  @ApiProperty()
  @Column({
    name: 'deletedAt',
    type: 'bigint',
    nullable: true,
  })
  public deletedAt: number | null = null;

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

  /**
   * Hooks
   */
  @BeforeInsert()
  public setCreatedAt(): void {
    this.createdAt = Math.floor(Date.now() / 1000);
    this.updatedAt = Math.floor(Date.now() / 1000);
  }

  @BeforeUpdate()
  public setUpdatedAt(): void {
    this.updatedAt = Math.floor(Date.now() / 1000);
  }
}
