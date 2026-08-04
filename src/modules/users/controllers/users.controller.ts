// Constants
import { ERROR_CODE } from '../../../common/constants/error-code.constant';
import { USER_ROLE } from '../../../common/constants/role.constant';

// Decorators
import { ApiBaseArrayResponse } from '../../../common/decorators/api-base-array-response.decorator';
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';

// DTOs
import { ListOptionDto } from '../../../common/dtos/list-options.dto';
import { UpdateUserProfileDto } from '../dtos/update-user.dto';

// Entities
import { UsersEntity } from '../entities/users.entity';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

// NestJS Libraries
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Services
import { UsersService } from '../services/users.service';

/**
 * @description HTTP surface for `UsersService`.
 *
 * The class existed before this commit with no handlers, and `UsersModule` carried no
 * `controllers` key at all — so every method on the service was unreachable over HTTP
 * despite being fully tested.
 *
 * Both guards are attached here rather than per route. `RolesGuard` is transparent on
 * handlers that declare no `@Roles()`, so controller-level attachment costs nothing and
 * means a handler added later cannot quietly arrive unguarded.
 *
 * Creating a user is deliberately absent. `UsersService.create` does not hash
 * passwords — `AuthenticationService.register` does that before calling it — so a
 * `POST /users` wired straight to the service would write plaintext. Registration goes
 * through `POST /auth/register`; an admin-creates-user endpoint has to go through the
 * hashing path first.
 */
@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthenticationJWTGuard, RolesGuard)
export class UsersController {
  constructor(private readonly _usersService: UsersService) {}

  /**
   * @description Allow admins everything, and everyone else only their own row.
   *
   * Coarse role checks belong in the guard; "is this your record" cannot, because the
   * guard has no idea which record a route is about. Throwing 403 rather than 404 is a
   * deliberate trade: it confirms the id exists, but hiding that would leave a user
   * unable to tell a typo from a permission problem on their own profile.
   */
  private _assertSelfOrAdmin(requester: IRequestUser, targetId: string): void {
    if (requester.role !== USER_ROLE.ADMIN && requester.id !== targetId) {
      throw new ForbiddenException({
        errorCode: ERROR_CODE.FORBIDDEN,
        message: 'You can only access your own user record.',
      });
    }
  }

  @Get()
  @Roles(USER_ROLE.ADMIN)
  @ApiOperation({
    summary: 'List users, optionally including soft-deleted ones',
  })
  @ApiBaseArrayResponse(UsersEntity)
  public async findAll(@Query() filters: ListOptionDto) {
    const result = await this._usersService.findAll(filters);

    return {
      message: 'Users have been retrieved successfully',
      result,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one user — admins any, everyone else only themselves',
  })
  @ApiBaseResponse(UsersEntity)
  public async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: ICustomRequestHeaders) {
    this._assertSelfOrAdmin(req.user, id);

    const result = await this._usersService.findOneById(id);

    return {
      message: 'User has been retrieved successfully',
      result,
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a user. The password is not changeable here — see UpdateUserProfileDto',
  })
  @ApiBaseResponse(UsersEntity)
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() requestBody: UpdateUserProfileDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    this._assertSelfOrAdmin(req.user, id);

    const result = await this._usersService.update(id, requestBody, req.user);

    return {
      message: 'User has been updated successfully',
      result,
    };
  }

  @Delete(':id')
  @Roles(USER_ROLE.ADMIN)
  @ApiOperation({
    summary: 'Soft-delete a user, freeing their email and username for reuse',
  })
  @ApiBaseResponse(UsersEntity)
  public async delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: ICustomRequestHeaders) {
    const result = await this._usersService.delete(id, req.user);

    return {
      message: 'User has been deleted successfully',
      result,
    };
  }

  /**
   * A POST rather than a PATCH: restoring is an action on a resource, not a partial
   * update of one, and the request carries no body to patch with. Answers 409
   * USER_RESTORE_CONFLICT when somebody has since claimed the email or username.
   */
  @Post(':id/restore')
  @Roles(USER_ROLE.ADMIN)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Restore a soft-deleted user',
  })
  @ApiBaseResponse(UsersEntity)
  public async restore(@Param('id', ParseUUIDPipe) id: string, @Req() req: ICustomRequestHeaders) {
    const result = await this._usersService.restore(id, req.user);

    return {
      message: 'User has been restored successfully',
      result,
    };
  }
}
