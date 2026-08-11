// Entities
import type { UsersEntity } from '../../modules/users/entities/users.entity';

// NestJS Libraries
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Passport
import { Strategy } from 'passport-local';

// Services
import { AuthenticationService } from '../../modules/authentication/services/authentication.service';

/**
 * @description Authenticates a username-and-password login by verifying the submitted
 * credentials against the stored bcrypt hash.
 *
 * This is the only path that turns a password into a session. Every other route authenticates
 * a token that this strategy ultimately caused to be issued.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local-auth') {
  constructor(private readonly _authenticationService: AuthenticationService) {
    super();
  }

  /**
   * @description Verifies a username and password, returning the user on success and throwing
   * a 401 otherwise.
   *
   * Whatever this returns becomes `request.user` for the login handler, which is how the
   * controller obtains an authenticated user without handling credentials itself. The rejection
   * is deliberately identical for an unknown username and a wrong password, so the endpoint
   * cannot be used to discover which accounts exist.
   *
   * @param username The submitted username.
   * @param password The submitted plaintext password.
   */
  public async validate(username: string, password: string): Promise<UsersEntity> {
    const user = await this._authenticationService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
