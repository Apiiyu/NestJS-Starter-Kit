// Class Validator
import { IsNotEmpty, IsString } from 'class-validator';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

// Swagger
import { ApiProperty } from '@nestjs/swagger';

/**
 * @description The credentials a login request carries.
 *
 * Validation here is presence only, deliberately. Applying the registration password policy at
 * sign-in would lock out every account whose password predates the current rules, and would
 * disclose the shape of that policy to anyone who can reach the endpoint.
 */
export class LoginUsernameDto {
  @ApiProperty()
  @IsNotEmpty()
  public username!: string;

  @ApiProperty()
  @IsNotEmpty()
  public password!: string;
}

/**
 * @description The token pair returned by a successful login or refresh.
 *
 * The access token is short-lived and sent on every request; the refresh token is long-lived,
 * rotated on each use, and presented only to the refresh endpoint.
 */
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

/**
 * @description The body of a refresh or logout request — the refresh token on its own.
 *
 * The token travels in the body rather than the `Authorization` header so it cannot be
 * confused with an access token by a proxy, a log, or a client that reuses one header for
 * every call.
 */
/**
 * @description The body of a refresh or logout request — the refresh token on its own.
 *
 * The token travels in the body rather than the `Authorization` header so it cannot be
 * confused with an access token by a proxy, a log, or a client that reuses one header for
 * every call.
 */
export class RefreshTokenDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  public refreshToken!: string;
}
