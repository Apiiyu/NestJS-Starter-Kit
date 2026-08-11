// Class Validator
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Constants
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  REGEX_PASSWORD,
} from '../../../common/constants/regex.constant';

// Swagger
import { ApiProperty } from '@nestjs/swagger';

/**
 * @description What a self-service registration request must supply.
 *
 * This is where the password policy is enforced, and the only place it is. Length is checked
 * by `@MinLength`/`@MaxLength` rather than folded into the pattern, so a too-short password is
 * told it is too short instead of failing one opaque regex that stands for four separate rules.
 */
export class RegisterEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  public username!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  public email!: string;

  /**
   * The policy is enforced here and not on `LoginDto`. Checking a password against the
   * current rules at sign-in would lock out everyone whose credential predates them, and
   * would tell an attacker the shape of the policy before they hold a valid account.
   */
  @ApiProperty({
    description:
      'At least one uppercase letter, one lowercase letter, and one digit or special ' +
      `character. Between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
    example: 'P@ssword12345',
    maxLength: PASSWORD_MAX_LENGTH,
    minLength: PASSWORD_MIN_LENGTH,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(REGEX_PASSWORD, {
    message:
      'password must contain an uppercase letter, a lowercase letter, and a digit or ' +
      'special character, and must not span multiple lines',
  })
  public password!: string;
}
