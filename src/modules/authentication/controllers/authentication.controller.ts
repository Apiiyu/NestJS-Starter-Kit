// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';

// DTOs
import { LoginUsernameDto, LoginWithAccessToken, RefreshTokenDto } from '../dtos/login.dto';
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import { UsersEntity, UsersService } from '../../users';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { AuthenticationLocalGuard } from '../../../common/guards/authentication-local.guard';

// NestJS Libraries
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Services
import { AuthenticationService } from '../services/authentication.service';

@Controller('authentication')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(
    private readonly _authenticationService: AuthenticationService,
    private readonly _usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login with username and password',
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

  @Post('register')
  @ApiOperation({
    summary: 'Register with email',
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
   * Unguarded on purpose. The refresh token *is* the credential, and requiring a live
   * access token alongside it would make the endpoint unusable in the one situation it
   * exists for: the access token has expired.
   */
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new access and refresh token pair',
  })
  @ApiBaseResponse(LoginWithAccessToken)
  public async refresh(@Body() requestBody: RefreshTokenDto) {
    const result = await this._authenticationService.refresh(requestBody.refreshToken);

    return {
      message: 'Token refreshed successfully',
      result,
    };
  }

  /**
   * Also unguarded, and for the same reason — a user pressing "log out" fifteen minutes
   * after their last request would otherwise be unable to. Revoking a token that does
   * not exist reports `revoked: false` rather than 404, so this cannot be used to probe
   * which tokens are real.
   */
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Revoke a refresh token',
  })
  public async logout(@Body() requestBody: RefreshTokenDto) {
    const result = await this._authenticationService.logout(requestBody.refreshToken);

    return {
      message: 'Logged out successfully',
      result,
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @Get('profile')
  @ApiBearerAuth()
  public async getProfile(@Req() req: ICustomRequestHeaders) {
    const result = await this._usersService.findOneById(req.user.id);

    return {
      message: 'Authenticated user profile has been retrieved successfully',
      result,
    };
  }
}
