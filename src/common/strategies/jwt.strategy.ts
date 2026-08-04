// Constants
import { ERROR_CODE } from '../constants/error-code.constant';
import { TOKEN_TYPE } from '../constants/token.constant';

// NestJS Libraries
import { Injectable, UnauthorizedException } from '@nestjs/common';
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
      /**
       * Tokens are signed with an `iss` claim, but nothing checked it on the way back
       * in. Verifying it means a token minted by some other service that happens to
       * share this secret — a staging deployment, a sibling app reading the same vault
       * entry — no longer authenticates against this one.
       */
      issuer: jwtConfigService.jwtIssuer,
    });
  }

  public validate(payload: IValidateJWTStrategy): IRequestUser {
    /**
     * Refresh tokens carry the same signature as access tokens, so `passport-jwt` has
     * already accepted this one as cryptographically valid by the time we get here.
     * Only the `type` claim tells them apart, and without this check a stolen refresh
     * token would work as a Bearer credential for its full seven days.
     */
    if (payload.type !== TOKEN_TYPE.ACCESS) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.AUTH_TOKEN_WRONG_TYPE,
        message: 'This endpoint requires an access token.',
      });
    }

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
  }
}
