// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';

// DTOs
import { LoginUsernameDto, LoginWithAccessToken } from '../dtos/login.dto';
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import { UsersEntity } from '../../users/entities/users.entity';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { AuthenticationLocalGuard } from '../../../common/guards/authentication-local.guard';

// NestJS Libraries
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Services
import { AuthenticationService } from '../services/authentication.service';
import { UsersService } from '../../users/services/users.service';

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
