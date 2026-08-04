// NestJS Libraries
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExp: process.env.JWT_EXPIRES_IN,
  jwtIssuer: process.env.JWT_ISSUER,
  /**
   * Refresh token lifetime. Defaulted rather than added to the required list in
   * `app-env.validation.ts`, because a duration with a sane default is not a secret
   * and making it mandatory would break every existing `.env` on upgrade. It is listed
   * in `.env.example` so it stays discoverable.
   */
  jwtRefreshExp: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
