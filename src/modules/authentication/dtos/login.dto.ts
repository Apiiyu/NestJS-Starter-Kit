// Class Validator
import { IsNotEmpty, IsString } from 'class-validator';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class LoginUsernameDto {
  @ApiProperty()
  @IsNotEmpty()
  public username!: string;

  @ApiProperty()
  @IsNotEmpty()
  public password!: string;
}

export class LoginWithAccessToken implements ILogin {
  @ApiProperty()
  public accessToken!: string;

  /**
   * Carried in the response body rather than an httpOnly cookie. A cookie would buy
   * XSS resistance at the cost of a CSRF surface on every state-changing route, and it
   * does nothing at all for the mobile and service clients this starter is aimed at.
   * Clients are expected to keep this out of `localStorage`.
   */
  @ApiProperty()
  public refreshToken!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  public refreshToken!: string;
}
