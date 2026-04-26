// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Passport
import { ExtractJwt, Strategy } from 'passport-jwt';

// Services
import { JwtConfigService } from '../../configurations/jwt/jwt-configuration.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(jwtConfigService: JwtConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfigService.jwtSecret,
    });
  }

  public validate(payload: IValidateJWTStrategy): IRequestUser {
    return { id: payload.sub, username: payload.username, email: payload.email };
  }
}
