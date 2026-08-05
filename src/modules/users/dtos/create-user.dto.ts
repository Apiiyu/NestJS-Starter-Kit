import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Constants
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  REGEX_PASSWORD,
} from '../../../common/constants/regex.constant';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  public username!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  public email!: string;

  // Same policy as registration — see RegisterEmailDto for why LoginDto is exempt.
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
