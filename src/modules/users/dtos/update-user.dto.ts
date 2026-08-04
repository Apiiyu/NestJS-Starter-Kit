// DTOs
import { CreateUserDto } from './create-user.dto';

// NestJS Libraries
import { OmitType, PartialType } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

/**
 * @description What `PATCH /users/:id` accepts — everything `UpdateUserDto` has except
 * the password.
 *
 * `UsersService.update` merges its payload straight onto the entity and saves. Nothing
 * on that path hashes anything; hashing lives in `AuthenticationService.register`. So
 * accepting `password` over HTTP here would write it to the database in plaintext.
 *
 * Changing a password properly needs the current one verified and every refresh token
 * family revoked, which is a feature rather than a field. Until that exists the field
 * is simply not reachable from the API — `whitelist: true` on the global
 * `ValidationPipe` strips it, which beats a silent plaintext write.
 */
export class UpdateUserProfileDto extends PartialType(OmitType(CreateUserDto, ['password'])) {}
