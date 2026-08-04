// Bcrypt
import * as bcrypt from 'bcrypt';

// Constants
import { ERROR_CODE } from '../../../common/constants/error-code.constant';
import { SALT_OR_ROUND } from '../../../common/constants/common.constant';

// DTOs
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import type { UsersEntity } from '../../users/entities/users.entity';

// Modules
import { JwtConfigModule } from '../../../configurations/jwt/jwt-configuration.module';

// NestJS Libraries
import { ConflictException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { AuthenticationService } from './authentication.service';
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

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userService: UsersService;

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
          },
        },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
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
    it('should return a accessToken', async () => {
      const request = {
        user: {
          id: '1',
          username: 'user name',
          email: 'test@test.com',
        },
      };

      expect(await service.login(request.user)).toHaveProperty('accessToken');
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
});
