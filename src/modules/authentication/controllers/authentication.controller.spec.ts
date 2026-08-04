// Controllers
import { AuthenticationController } from './authentication.controller';

// DTOs
import { LoginUsernameDto, RefreshTokenDto } from '../dtos/login.dto';

// NestJS Libraries
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Modules
import { JwtConfigModule } from '../../../configurations/jwt/jwt-configuration.module';

// Services
import { AuthenticationService } from '../services/authentication.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { UsersService } from '../../users/services/users.service';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;

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
            create: jest
              .fn()
              .mockImplementation((user: UsersService) => Promise.resolve({ id: '1', ...user })),
            findAll: jest.fn().mockResolvedValue([
              {
                email: 'email #1',
                name: 'name #1',
              },
              {
                email: 'email #2',
                name: 'name #2',
              },
            ]),
            findOne: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({
                email: 'email #1',
                name: 'name #1',
                id,
              }),
            ),
            findOneByEmail: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({
                email: 'email #1',
                name: 'name #1',
                id,
              }),
            ),
            findOneById: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({
                email: 'test@test.com',
                id,
                role: 'user',
                username: 'user name',
              }),
            ),
            remove: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
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
          },
        },
      ],
      controllers: [AuthenticationController],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('[POST] /authentication/login', () => {
    it('should return a accessToken', async () => {
      const body = new LoginUsernameDto();
      body.username = 'email@test.com';
      body.password = 'secret';

      const request = {
        user: {
          id: '1',
          username: 'user name',
          email: 'test@test.com',
          role: 'user',
        },
      };

      const response = await controller.login(body, request as unknown as ICustomRequestHeaders);

      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('result');
      expect(response.message).toBe('User logged in successfully');
      expect(response.result).toHaveProperty('accessToken');
      expect(response.result).toHaveProperty('refreshToken');
    });
  });

  describe('[POST] /authentication/refresh', () => {
    it('should return a new token pair', async () => {
      const body = new RefreshTokenDto();
      body.refreshToken = 'raw-refresh-token';

      const response = await controller.refresh(body);

      expect(response.message).toBe('Token refreshed successfully');
      expect(response.result).toHaveProperty('accessToken');
      expect(response.result.refreshToken).toBe('rotated-refresh-token');
    });
  });

  describe('[POST] /authentication/logout', () => {
    it('should report that the token was revoked', async () => {
      const body = new RefreshTokenDto();
      body.refreshToken = 'raw-refresh-token';

      const response = await controller.logout(body);

      expect(response.message).toBe('Logged out successfully');
      expect(response.result).toEqual({ revoked: true });
    });
  });
});
