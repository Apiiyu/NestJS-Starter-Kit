// Class Validator
import { IsUUID } from 'class-validator';

// Swagger
import { ApiProperty } from '@nestjs/swagger';

/**
 * @description A route parameter that must be a UUID.
 *
 * Validating the shape at the boundary is what turns a malformed ID into a 400 rather than a
 * database error — Postgres rejects a non-UUID string for a `uuid` column with a 500-shaped
 * failure that tells the client nothing useful.
 */
export class ParamIdDto {
  @ApiProperty()
  @IsUUID()
  public id!: string;
}
