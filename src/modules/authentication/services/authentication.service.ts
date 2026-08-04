// Bcrypt
import * as bcrypt from 'bcrypt';

// Constants
import { BAD_REQUEST_MSG, SALT_OR_ROUND } from '../../../common/constants/common.constant';

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
    const payload = { email: user.email, sub: user.id, username: user.username };

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
