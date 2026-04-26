// Entities
import type { UsersEntity } from '../../modules/users/entities/users.entity';

// NestJS Libraries
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Passport
import { Strategy } from 'passport-local';

// Services
import { AuthenticationService } from '../../modules/authentication/services/authentication.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local-auth') {
  constructor(private readonly _authenticationService: AuthenticationService) {
    super();
  }

  public async validate(username: string, password: string): Promise<UsersEntity> {
    const user = await this._authenticationService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
