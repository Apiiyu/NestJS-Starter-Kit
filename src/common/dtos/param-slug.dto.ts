// Class Validator
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @description A route parameter carrying a non-empty slug, for resources addressed by a
 * human-readable identifier rather than a UUID.
 */
export class ParamSlugDto {
  @IsNotEmpty()
  @IsString()
  public slug!: string;
}
