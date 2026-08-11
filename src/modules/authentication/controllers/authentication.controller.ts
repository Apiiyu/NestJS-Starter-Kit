// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';

// DTOs
import { LoginUsernameDto, LoginWithAccessToken, RefreshTokenDto } from '../dtos/login.dto';
import { RegisterEmailDto } from '../dtos/register.dto';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { AuthenticationLocalGuard } from '../../../common/guards/authentication-local.guard';

// Modules
import { UsersEntity, UsersService } from '../../users';

// NestJS Libraries
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';

// Services
import { AuthenticationService } from '../services/authentication.service';

// Swagger
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * @description The authentication surface: register, login, refresh, logout, and profile.
 *
 * Every route here is public except `profile` — these are the endpoints a caller reaches
 * *before* it holds a valid access token, which is why the JWT guard is applied per route
 * rather than to the controller.
 */
@Controller('authentication')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(
    private readonly _authenticationService: AuthenticationService,
    private readonly _usersService: UsersService,
  ) {}

  /**
   * @description Registers a new account and returns it.
   *
   * This is the one endpoint that applies the password policy. A collision on username or
   * email is detected by the database's unique index rather than by a prior lookup, so two
   * simultaneous registrations for the same address cannot both succeed.
   */
  @Post('register')
  @ApiOperation({
    summary: 'Register with email',
    description: 'Creates a user account after validating and hashing its password.',
  })
  @ApiBaseResponse(UsersEntity)
  public async create(@Body() requestBody: RegisterEmailDto) {
    const result = await this._authenticationService.register(requestBody);

    return {
      message: 'User registered successfully',
      result,
    };
  }

  /**
   * @description Returns the account belonging to the presented access token.
   *
   * Re-reads the user from the database rather than echoing the token claims, so a change made
   * after the token was issued is reflected instead of being masked until the token expires.
   */
  @UseGuards(AuthenticationJWTGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the authenticated user profile',
    description: 'Returns the user identified by the bearer access token.',
  })
  public async getProfile(@Req() req: ICustomRequestHeaders) {
    const result = await this._usersService.findOneById(req.user.id);

    return {
      message: 'Authenticated user profile has been retrieved successfully',
      result,
    };
  }

  /**
   * @description Exchanges username and password for an access and refresh token pair.
   *
   * Answers 200 rather than 201: a login creates a session, not a resource the client can
   * address. Credentials are checked against the stored bcrypt hash without re-applying the
   * registration policy, so an account predating a policy change can still sign in.
   */
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login with username and password',
    description: 'Authenticates local credentials and returns an access and refresh token pair.',
  })
  @ApiBaseResponse(LoginWithAccessToken)
  @UseGuards(AuthenticationLocalGuard)
  public async login(@Body() _body: LoginUsernameDto, @Req() req: ICustomRequestHeaders) {
    const result = await this._authenticationService.login(req.user);

    return {
      message: 'User logged in successfully',
      result,
    };
  }

  /**
   * Also unguarded, and for the same reason — a user pressing "log out" fifteen minutes
   * after their last request would otherwise be unable to. Revoking a token that does
   * not exist reports `revoked: false` rather than 404, so this cannot be used to probe
   * which tokens are real.
   */
  /**
   * @description Revokes a refresh token, ending that session.
   *
   * Idempotent, and deliberately gives the same answer for a token that never existed as for
   * one it just revoked — otherwise logout would report which tokens are real.
   */
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Revoke a refresh token',
    description: 'Invalidates a refresh-token session and remains idempotent for unknown tokens.',
  })
  public async logout(@Body() requestBody: RefreshTokenDto) {
    const result = await this._authenticationService.logout(requestBody.refreshToken);

    return {
      message: 'Logged out successfully',
      result,
    };
  }

  /**
   * Unguarded on purpose. The refresh token *is* the credential, and requiring a live
   * access token alongside it would make the endpoint unusable in the one situation it
   * exists for: the access token has expired.
   */
  /**
   * @description Exchanges a refresh token for a new token pair, revoking the old one.
   *
   * Unguarded on purpose. Requiring a live access token here would defeat the only situation
   * this endpoint exists for: the access token has expired. Presenting an already-spent token
   * revokes the entire family, because a replay is what a stolen token looks like.
   */
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new access and refresh token pair',
    description: 'Rotates a valid refresh token without requiring a live access token.',
  })
  @ApiBaseResponse(LoginWithAccessToken)
  public async refresh(@Body() requestBody: RefreshTokenDto) {
    const result = await this._authenticationService.refresh(requestBody.refreshToken);

    return {
      message: 'Token refreshed successfully',
      result,
    };
  }
}
