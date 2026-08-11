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

/**
 * @description Validates the bearer token on every authenticated request: signature, issuer,
 * and expiry.
 *
 * The issuer check matters as much as the signature. A token signed with the same secret by a
 * different service would otherwise be accepted here, so sharing a secret across services
 * would silently make their tokens interchangeable.
 */
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

  /**
   * @description Turns a verified token payload into the user object the rest of the request
   * sees on `request.user`.
   *
   * Passport only calls this after the signature, issuer, and expiry have already passed, so
   * the payload can be trusted here — but only as far as it goes. It reflects what was true
   * when the token was issued, which is why anything that must be current (a ban, a revoked
   * role) is checked against the database by a guard rather than read from these claims.
   *
   * @param payload The decoded and verified JWT claims.
   */
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
