// Bcrypt
import * as bcrypt from 'bcrypt';

// Constants
import { BAD_REQUEST_MSG, SALT_OR_ROUND } from '../../../common/constants/common.constant';
import { TOKEN_TYPE } from '../../../common/constants/token.constant';

// Crypto
import { randomUUID } from 'node:crypto';

// DTOs
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import { UsersEntity } from '../../users/entities/users.entity';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

// NestJS Libraries
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Services
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly _usersService: UsersService,
    private readonly _jwtService: JwtService,
  ) {}

  /**
   * @description Handle business logic for validating a user
   */
  public async validateUser(username: string, pass: string): Promise<UsersEntity | null> {
    try {
      const user = await this._usersService.findOneByUsername(username);
      const isMatch = await bcrypt.compare(`${pass}`, user!.password);

      if (!isMatch) {
        throw new BadRequestException('Bad Request', {
          cause: new Error(),
          description: 'Invalid password',
        });
      }

      return user;
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Handle business logic for logging in a user
   */
  public async login(user: IRequestUser): Promise<ILogin> {
    /**
     * `jti` and `type` are not decoration.
     *
     * Without `jti` a token cannot be named, and anything that cannot be named cannot
     * be revoked — logout would be a client-side gesture that leaves a valid
     * credential in the wild until it expires on its own.
     *
     * Without `type`, a refresh token is indistinguishable from an access token: both
     * are signed with the same secret, so the long-lived one verifies as the
     * short-lived one and the 15-minute access TTL buys nothing.
     *
     * `role` is embedded so authorisation does not need a database round trip per
     * request. The cost is bounded staleness — a role change takes effect for that
     * user when their access token next rotates, which is why the access TTL is short.
     */
    const payload: IValidateJWTStrategy = {
      email: user.email,
      jti: randomUUID(),
      role: user.role,
      sub: user.id,
      type: TOKEN_TYPE.ACCESS,
      username: user.username,
    };

    return {
      accessToken: this._jwtService.sign(payload),
    };
  }

  /**
   * @description Handle business logic for registering a user
   */
  public async register(payload: RegisterEmailDto): Promise<UsersEntity> {
    const { email, username, password } = payload;

    /**
     * Hash Password
     */
    const passwordHashed = await bcrypt.hash(password, SALT_OR_ROUND);

    /**
     * No "does this email exist?" lookup before the insert. Two requests for the same
     * address can both pass that check and both proceed, so it never actually
     * prevented the duplicate — it only decided whether the duplicate surfaced as a
     * clean 409 or as an unhandled index error. The partial unique indexes on `users`
     * settle it atomically, and `UsersService.create` turns the resulting 23505 into
     * `USER_EMAIL_TAKEN` / `USER_USERNAME_TAKEN`.
     *
     * The old catch-all is gone with it: wrapping every failure in a 400 swallowed
     * those 409s too, along with any genuine 500.
     */
    return this._usersService.create({
      email,
      username,
      password: passwordHashed,
    });
  }
}
