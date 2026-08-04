import { createHash } from 'node:crypto';

import { UnauthorizedException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';

import { ERROR_CODE } from '../../../common/constants/error-code.constant';
import { JwtConfigService } from '../../../configurations/jwt/jwt-configuration.service';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { RefreshTokenService } from './refresh-token.service';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const FAMILY_ID = '22222222-2222-2222-2222-222222222222';
const TOKEN_ID = '33333333-3333-3333-3333-333333333333';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** Postgres returns `[rows, rowCount]` from an UPDATE ... RETURNING through TypeORM. */
const updateReturning = (rows: unknown[]): unknown => [rows, rows.length];

const mockRepo = {
  create: jest.fn((input: unknown) => input),
  findOne: jest.fn(),
  query: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockJwtConfig = { jwtRefreshExp: '7d' };

const rejection = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error('Expected the call to reject, but it resolved.');
    },
    (error: unknown) => error,
  );

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRepo },
        { provide: JwtConfigService, useValue: mockJwtConfig },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    jest.clearAllMocks();
    mockRepo.create.mockImplementation((input: unknown) => input);
    mockRepo.update.mockResolvedValue({ affected: 1 });
  });

  describe('issue', () => {
    beforeEach(() => {
      mockRepo.save.mockImplementation((row: Record<string, unknown>) =>
        Promise.resolve({ ...row, id: TOKEN_ID }),
      );
    });

    /**
     * The single most important property of this table: a database dump must not be a
     * set of live sessions. Only the digest is ever persisted.
     */
    it('persists the hash and never the raw token', async () => {
      const issued = await service.issue(USER_ID);
      const persisted = mockRepo.save.mock.calls[0][0] as Record<string, unknown>;

      expect(persisted.tokenHash).toBe(sha256(issued.token));
      expect(JSON.stringify(persisted)).not.toContain(issued.token);
    });

    it('starts a new family when none is given', async () => {
      const first = await service.issue(USER_ID);
      const second = await service.issue(USER_ID);

      expect(first.familyId).not.toBe(second.familyId);
    });

    it('joins the given family when continuing a chain', async () => {
      const issued = await service.issue(USER_ID, FAMILY_ID);

      expect(issued.familyId).toBe(FAMILY_ID);
    });

    it('derives expiry from the configured refresh lifetime', async () => {
      const before = Date.now();
      const issued = await service.issue(USER_ID);

      // 7d, with a generous window so a slow machine cannot make this flaky
      expect(issued.expiresAt.getTime() - before).toBeGreaterThan(604_800_000 - 5_000);
      expect(issued.expiresAt.getTime() - before).toBeLessThanOrEqual(604_800_000 + 5_000);
    });

    it('gives every issued token a distinct value', async () => {
      const first = await service.issue(USER_ID);
      const second = await service.issue(USER_ID);

      expect(second.token).not.toBe(first.token);
    });
  });

  describe('rotate', () => {
    const claimable = (expiresAt: Date): unknown =>
      updateReturning([{ id: TOKEN_ID, userId: USER_ID, familyId: FAMILY_ID, expiresAt }]);

    beforeEach(() => {
      mockRepo.save.mockImplementation((row: Record<string, unknown>) =>
        Promise.resolve({ ...row, id: 'successor-id' }),
      );
    });

    /**
     * The claim has to be one statement. As a SELECT followed by an UPDATE, two
     * requests carrying the same token could both pass the SELECT and both mint a
     * successor — which is exactly the replay this design exists to catch.
     */
    it('claims the token with a single conditional UPDATE', async () => {
      mockRepo.query.mockResolvedValue(claimable(new Date(Date.now() + 60_000)));

      await service.rotate('presented-token');

      const [sql, params] = mockRepo.query.mock.calls[0] as [string, string[]];

      expect(sql).toMatch(/UPDATE "refresh_tokens"/);
      expect(sql).toMatch(/"revokedAt" IS NULL/);
      expect(sql).toMatch(/RETURNING/);
      expect(params).toEqual([sha256('presented-token')]);
    });

    it('mints a successor in the same family and links it back', async () => {
      mockRepo.query.mockResolvedValue(claimable(new Date(Date.now() + 60_000)));

      const rotated = await service.rotate('presented-token');

      expect(rotated.familyId).toBe(FAMILY_ID);
      expect(rotated.replacedId).toBe(TOKEN_ID);
      expect(mockRepo.update).toHaveBeenCalledWith(TOKEN_ID, { replacedById: rotated.id });
    });

    it('rejects a token the database has never seen', async () => {
      mockRepo.query.mockResolvedValue(updateReturning([]));
      mockRepo.findOne.mockResolvedValue(null);

      const error = await rejection(service.rotate('never-issued'));

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.AUTH_REFRESH_INVALID,
      });
    });

    /**
     * A token that exists but could not be claimed was already spent. Only a second
     * holder can present it, so the entire chain dies — there is no way to tell the
     * thief from the legitimate user, and leaving either one logged in is the wrong
     * bet.
     */
    it('revokes the whole family when a spent token is replayed', async () => {
      mockRepo.query.mockResolvedValue(updateReturning([]));
      mockRepo.findOne.mockResolvedValue({ familyId: FAMILY_ID, userId: USER_ID });
      mockRepo.update.mockResolvedValue({ affected: 3 });

      const error = await rejection(service.rotate('already-spent'));

      expect(mockRepo.update).toHaveBeenCalledWith(
        { familyId: FAMILY_ID, revokedAt: IsNull() },
        { revokedAt: expect.any(Date) },
      );
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.AUTH_REFRESH_REUSED,
      });
    });

    it('does not mint a successor when the token was replayed', async () => {
      mockRepo.query.mockResolvedValue(updateReturning([]));
      mockRepo.findOne.mockResolvedValue({ familyId: FAMILY_ID, userId: USER_ID });

      await rejection(service.rotate('already-spent'));

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    /**
     * Expiry is a different answer from replay: log in again, versus your session was
     * compromised. Folding the check into the WHERE clause would collapse the two.
     */
    it('reports an expired token as expired, not as a replay', async () => {
      mockRepo.query.mockResolvedValue(claimable(new Date(Date.now() - 1_000)));

      const error = await rejection(service.rotate('stale-token'));

      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.AUTH_REFRESH_EXPIRED,
      });
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    /**
     * TypeORM returns `[rows, rowCount]` for UPDATE but a bare array for SELECT.
     * Handling only one shape would break the whole flow at runtime while every mock
     * kept passing.
     */
    it('understands a bare rows array as well as the [rows, count] pair', async () => {
      mockRepo.query.mockResolvedValue([
        {
          id: TOKEN_ID,
          userId: USER_ID,
          familyId: FAMILY_ID,
          expiresAt: new Date(Date.now() + 60_000),
        },
      ]);

      await expect(service.rotate('presented-token')).resolves.toMatchObject({
        familyId: FAMILY_ID,
      });
    });
  });

  describe('revoke', () => {
    it('revokes only a token that is still live', async () => {
      await service.revoke('some-token');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { revokedAt: IsNull(), tokenHash: sha256('some-token') },
        { revokedAt: expect.any(Date) },
      );
    });

    it('reports whether anything was actually revoked', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.revoke('unknown-token')).resolves.toBe(false);
    });

    // Logout must not double as an oracle for which tokens exist.
    it('does not throw on an unknown token', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.revoke('unknown-token')).resolves.not.toThrow();
    });
  });

  describe('revokeFamily', () => {
    it('returns how many live tokens it killed', async () => {
      mockRepo.update.mockResolvedValue({ affected: 4 });

      await expect(service.revokeFamily(FAMILY_ID)).resolves.toBe(4);
    });
  });
});
