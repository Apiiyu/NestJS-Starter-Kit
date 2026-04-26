// Class Transformer
import { Exclude } from 'class-transformer';

// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity } from 'typeorm';

@Entity('users')
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
