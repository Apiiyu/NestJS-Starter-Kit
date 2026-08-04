// Bcrypt
import * as bcrypt from 'bcrypt';

// Constants
import { ERROR_CODE } from '../../../common/constants/error-code.constant';
import { SALT_OR_ROUND } from '../../../common/constants/common.constant';
import { TOKEN_TYPE } from '../../../common/constants/token.constant';
import { USER_ROLE } from '../../../common/constants/role.constant';

// DTOs
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import type { UsersEntity } from '../../users/entities/users.entity';

// Modules
import { JwtConfigModule } from '../../../configurations/jwt/jwt-configuration.module';

// NestJS Libraries
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { AuthenticationService } from './authentication.service';
import { RefreshTokenService } from './refresh-token.service';
import { UsersService } from '../../users/services/users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const expectedValue = {
  email: 'email #1',
  username: 'name',
  password: 'password',
  id: '1',
  createdAt: new Date('2026-08-04T09:15:00.000Z'),
  createdBy: 'admin',
  createdById: '1',
  updatedAt: new Date('2026-08-04T09:15:00.000Z'),
  updatedBy: 'admin',
  updatedById: '1',
  deletedAt: null,
  deletedBy: 'admin',
  deletedById: '1',
} as UsersEntity;

/** Read the claim set back off the wire rather than trusting the input object. */
const decodeClaims = (accessToken: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString()) as Record<
    string,
    unknown
  >;

const buildRefreshTokenServiceMock = () => ({
  issue: jest.fn().mockResolvedValue({
    id: 'refresh-1',
    token: 'raw-refresh-token',
    userId: '1',
    familyId: 'family-1',
    expiresAt: new Date('2026-08-11T09:15:00.000Z'),
  }),
  revoke: jest.fn().mockResolvedValue(true),
  revokeFamily: jest.fn().mockResolvedValue(1),
  rotate: jest.fn().mockResolvedValue({
    id: 'refresh-2',
    token: 'rotated-refresh-token',
    userId: '1',
    familyId: 'family-1',
    expiresAt: new Date('2026-08-11T09:15:00.000Z'),
    replacedId: 'refresh-1',
  }),
});

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userService: UsersService;
  let refreshTokenService: ReturnType<typeof buildRefreshTokenServiceMock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtConfigModule,
        PassportModule,
        JwtModule.register({
          secretOrPrivateKey: 'secret',
          signOptions: {
            expiresIn: 3600,
          },
        }),
      ],
      providers: [
        AuthenticationService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({
                email: 'email #1',
                username: 'name #1',
                id,
              }),
            ),
            findOneByUsername: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({
                email: 'email #1',
                username: 'name #1',
                id,
              }),
            ),
            create: jest
              .fn()
              .mockImplementation((user: UsersService) => Promise.resolve({ id: '1', ...user })),
            findOneById: jest.fn().mockResolvedValue({
              email: 'test@test.com',
              id: '1',
              role: USER_ROLE.USER,
              username: 'user name',
            }),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: buildRefreshTokenServiceMock(),
        },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
    refreshTokenService = module.get(RefreshTokenService);
    service = module.get<AuthenticationService>(AuthenticationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return bad request invalid credentials when user not found', async () => {
      const username = 'username';
      const password = 'secret';

      jest.spyOn(userService, 'findOneByUsername').mockResolvedValue(expectedValue);

      try {
        await service.validateUser(username, password);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should return bad request invalid credentials when password invalid', async () => {
      const username = 'username';
      const password = 'secret';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.validateUser(username, password);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should return a user', async () => {
      const username = 'username';
      const password = 'secret';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      expect(await service.validateUser(username, password)).toHaveProperty('id');
    });
  });

  describe('login', () => {
    const requestUser: IRequestUser = {
      id: '1',
      username: 'user name',
      email: 'test@test.com',
      role: USER_ROLE.USER,
    };

    it('should return a accessToken', async () => {
      expect(await service.login(requestUser)).toHaveProperty('accessToken');
    });

    it('should open a new refresh chain and hand back its raw token', async () => {
      const result = await service.login(requestUser);

      expect(refreshTokenService.issue).toHaveBeenCalledWith('1');
      expect(result.refreshToken).toBe('raw-refresh-token');
    });

    it('should stamp sub, type and role into the token', async () => {
      const { accessToken } = await service.login(requestUser);

      expect(decodeClaims(accessToken)).toMatchObject({
        email: 'test@test.com',
        role: USER_ROLE.USER,
        sub: '1',
        type: TOKEN_TYPE.ACCESS,
        username: 'user name',
      });
    });

    /**
     * A token with no `jti` cannot be named, and a token that cannot be named cannot
     * be revoked — logout would leave a working credential in the wild until it
     * expired on its own. Two logins must therefore never share an id.
     */
    it('should give every login its own jti', async () => {
      const first = decodeClaims((await service.login(requestUser)).accessToken);
      const second = decodeClaims((await service.login(requestUser)).accessToken);

      expect(first.jti).toEqual(expect.any(String));
      expect(second.jti).not.toBe(first.jti);
    });
  });

  describe('register', () => {
    const buildBody = (): RegisterEmailDto => {
      const body = new RegisterEmailDto();
      body.username = 'user name';
      body.email = 'email@test.com';
      body.password = 'secret';

      return body;
    };

    it('should hash the password and hand creation to UsersService', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-secret');

      const result = await service.register(buildBody());

      expect(bcrypt.hash).toHaveBeenCalledWith('secret', SALT_OR_ROUND);
      expect(userService.create).toHaveBeenCalledWith({
        email: 'email@test.com',
        username: 'user name',
        password: 'hashed-secret',
      });
      expect(result).toHaveProperty('id');
    });

    /**
     * The old implementation asked `findOneByEmail` first and threw if it found
     * anything. That check never prevented a duplicate — two concurrent signups both
     * read "free" — it only decided whether the duplicate came back as a clean 409 or
     * as an unhandled index error. The partial unique index is the arbiter now, so the
     * lookup has to be gone, not merely unused.
     */
    it('should not pre-check the email, leaving the unique index to arbitrate', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-secret');

      await service.register(buildBody());

      expect(userService.findOneByEmail).not.toHaveBeenCalled();
    });

    it('should propagate the 409 UsersService raises for a taken email', async () => {
      const conflict = new ConflictException({
        errorCode: ERROR_CODE.USER_EMAIL_TAKEN,
        message: 'A user with this email already exists.',
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-secret');
      jest.spyOn(userService, 'create').mockRejectedValue(conflict);

      await expect(service.register(buildBody())).rejects.toBe(conflict);
    });
  });

  describe('refresh', () => {
    it('should rotate the presented token and return the successor', async () => {
      const result = await service.refresh('raw-refresh-token');

      expect(refreshTokenService.rotate).toHaveBeenCalledWith('raw-refresh-token');
      expect(result.refreshToken).toBe('rotated-refresh-token');
    });

    /**
     * The role in the new access token has to come from the database, not from the old
     * token. Copying it forward would mean a demoted admin keeps admin for as long as
     * they keep refreshing — which is unbounded, and defeats the point of the short
     * access TTL.
     */
    it('should re-read the user so a changed role takes effect', async () => {
      jest.spyOn(userService, 'findOneById').mockResolvedValue({
        email: 'test@test.com',
        id: '1',
        role: USER_ROLE.ADMIN,
        username: 'user name',
      } as UsersEntity);

      const result = await service.refresh('raw-refresh-token');

      expect(userService.findOneById).toHaveBeenCalledWith('1');
      expect(decodeClaims(result.accessToken)).toMatchObject({ role: USER_ROLE.ADMIN });
    });

    it('should kill the family and reject when the account is gone', async () => {
      jest.spyOn(userService, 'findOneById').mockRejectedValue(new NotFoundException());

      const error = await service.refresh('raw-refresh-token').then(
        () => null,
        (thrown: unknown) => thrown,
      );

      expect(refreshTokenService.revokeFamily).toHaveBeenCalledWith('family-1');
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.AUTH_REFRESH_INVALID,
      });
    });
  });

  describe('logout', () => {
    it('should revoke the presented token', async () => {
      await expect(service.logout('raw-refresh-token')).resolves.toEqual({ revoked: true });
      expect(refreshTokenService.revoke).toHaveBeenCalledWith('raw-refresh-token');
    });

    // Logout must not tell a caller whether a token was real.
    it('should report revoked:false for an unknown token rather than throwing', async () => {
      refreshTokenService.revoke.mockResolvedValue(false);

      await expect(service.logout('who-knows')).resolves.toEqual({ revoked: false });
    });
  });
});
