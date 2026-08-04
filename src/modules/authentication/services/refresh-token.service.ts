// Constants
import { ERROR_CODE } from '../../../common/constants/error-code.constant';

// Crypto
import { createHash, randomBytes, randomUUID } from 'node:crypto';

// Entities
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

// Helpers
import { parseDurationToMs } from '../../../common/helpers/duration.helper';

// Interfaces
import type {
  IIssuedRefreshToken,
  IRotatedRefreshToken,
} from '../interfaces/authentication.interface';

// NestJS Libraries
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Services
import { JwtConfigService } from '../../../configurations/jwt/jwt-configuration.service';

// TypeORM
import { IsNull, Repository } from 'typeorm';

/** Shape of the row the rotation statement returns. */
interface IClaimedToken {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
}

/**
 * @description TypeORM hands back `[rows, rowCount]` for UPDATE and DELETE on Postgres
 * but a bare rows array for SELECT, and the type is `any` either way. Reading `raw[0]`
 * blindly would therefore yield the rows array on an UPDATE and the first row on a
 * SELECT — a bug that shows up only at runtime, and only on one of the two paths.
 */
const unwrapReturning = <T>(raw: unknown): T[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return (Array.isArray(raw[0]) ? raw[0] : raw) as T[];
};

@Injectable()
export class RefreshTokenService {
  private readonly _logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly _refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly _jwtConfigService: JwtConfigService,
  ) {}

  private _hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private _expiresAt(): Date {
    return new Date(Date.now() + parseDurationToMs(this._jwtConfigService.jwtRefreshExp));
  }

  /**
   * @description Decide what a token that could not be claimed actually was, and fail
   * accordingly. Always throws.
   *
   * Reaching here means the compare-and-swap matched nothing, which has exactly two
   * causes: the hash is unknown, or the row exists but `revokedAt` is already set.
   * The second is the interesting one — somebody presented a token that had already
   * been spent. On a healthy client that cannot happen, because each token is used
   * once and immediately replaced. It happens when two parties hold tokens from the
   * same chain, which is what a theft looks like.
   *
   * The response revokes the whole family rather than just the replayed link, because
   * there is no way to tell the thief from the legitimate holder: whichever one
   * refreshed most recently holds the live token, and that could be either. Killing
   * the family logs both out and forces a password-backed login.
   */
  private async _rejectUnclaimable(tokenHash: string): Promise<never> {
    const existing = await this._refreshTokenRepository.findOne({
      where: { tokenHash },
      select: { familyId: true, userId: true },
    });

    if (!existing) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.AUTH_REFRESH_INVALID,
        message: 'Refresh token is not recognised.',
      });
    }

    const revoked = await this.revokeFamily(existing.familyId);

    this._logger.warn(
      `Refresh token replay detected for user ${existing.userId}; revoked ${revoked} token(s) in family ${existing.familyId}.`,
    );

    throw new UnauthorizedException({
      errorCode: ERROR_CODE.AUTH_REFRESH_REUSED,
      message: 'Refresh token has already been used. Every session from this login was revoked.',
    });
  }

  /**
   * @description Mint a refresh token for a user.
   *
   * Omit `familyId` to start a new chain — that is what a fresh login does. Pass the
   * existing one to extend a chain during rotation, so the whole lineage stays
   * revocable as a unit.
   *
   * The caller receives the only copy of the raw token that will ever exist; the
   * database keeps just its SHA-256.
   */
  public async issue(
    userId: string,
    familyId: string = randomUUID(),
  ): Promise<IIssuedRefreshToken> {
    const token = randomBytes(32).toString('base64url');

    const saved = await this._refreshTokenRepository.save(
      this._refreshTokenRepository.create({
        expiresAt: this._expiresAt(),
        familyId,
        tokenHash: this._hash(token),
        userId,
      }),
    );

    return { expiresAt: saved.expiresAt, familyId, id: saved.id, token, userId };
  }

  /**
   * @description Spend a refresh token and return its successor.
   *
   * The claim is a single `UPDATE ... WHERE "revokedAt" IS NULL RETURNING`, which is
   * the entire concurrency story. Postgres evaluates the predicate and writes the row
   * under one lock, so of two requests racing with the same token exactly one gets a
   * row back and the other gets nothing — no window, no advisory lock, no
   * read-then-write. Splitting this into "look it up, check it, then revoke it" would
   * reopen that window and make a stolen token usable twice.
   */
  public async rotate(presentedToken: string): Promise<IRotatedRefreshToken> {
    const tokenHash = this._hash(presentedToken);

    const claimed = unwrapReturning<IClaimedToken>(
      await this._refreshTokenRepository.query(
        `UPDATE "refresh_tokens"
            SET "revokedAt" = now()
          WHERE "tokenHash" = $1
            AND "revokedAt" IS NULL
      RETURNING "id", "userId", "familyId", "expiresAt"`,
        [tokenHash],
      ),
    );

    const current = claimed[0];

    if (!current) {
      await this._rejectUnclaimable(tokenHash);
    }

    /**
     * Expiry is checked after the claim, not folded into the `WHERE`. In the predicate
     * it would make an expired token indistinguishable from a replayed one, and those
     * deserve very different answers: one is a routine "log in again", the other means
     * a credential leaked and every session has to die.
     */
    if (current.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.AUTH_REFRESH_EXPIRED,
        message: 'Refresh token has expired. Please log in again.',
      });
    }

    const successor = await this.issue(current.userId, current.familyId);

    // ? Forensics only: lets a compromised chain be walked forward from the leak point
    await this._refreshTokenRepository.update(current.id, { replacedById: successor.id });

    return { ...successor, replacedId: current.id };
  }

  /**
   * @description Revoke a single token — what logout does.
   *
   * Scoped to `revokedAt IS NULL` so a repeated logout is a no-op rather than moving
   * the timestamp forward, and returns whether anything was actually revoked. It never
   * throws on an unknown token: logout must not double as an oracle for which tokens
   * exist.
   */
  public async revoke(token: string): Promise<boolean> {
    const result = await this._refreshTokenRepository.update(
      { revokedAt: IsNull(), tokenHash: this._hash(token) },
      { revokedAt: new Date() },
    );

    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Revoke every live token descended from one login.
   *
   * Used on replay detection, and available for "log out everywhere". Returns how many
   * tokens were killed.
   */
  public async revokeFamily(familyId: string): Promise<number> {
    const result = await this._refreshTokenRepository.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    return result.affected ?? 0;
  }
}
