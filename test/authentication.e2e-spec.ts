// Constants
import { ERROR_CODE } from '../src/common/constants/error-code.constant';

// Crypto
import { randomUUID } from 'node:crypto';

// Modules
import { AppModule } from '../src/app.module';

// NestJS Libraries
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Supertest
import request from 'supertest';

interface IControllerResponse<T> {
  message: string;
  result: T;
}

interface IErrorResponse {
  data: null;
  errorCode: string;
  message: string;
  path: string;
  statusCode: number;
  timestamp: string;
}

interface ILoginResult {
  accessToken: string;
  refreshToken: string;
}

interface IUserResult {
  email: string;
  id: string;
  username: string;
}

interface ITestUser {
  email: string;
  password: string;
  username: string;
}

const makeUniqueUser = (label: string): ITestUser => {
  const uniqueValue = `${Date.now()}-${process.pid}-${randomUUID()}`;

  return {
    email: `${label}-${uniqueValue}@example.test`,
    password: 'P@ssword12345',
    username: `${label}-${uniqueValue}`,
  };
};

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (user: ITestUser): Promise<IUserResult> => {
    const response = await request(app.getHttpServer())
      .post('/api/authentication/register')
      .send(user)
      .expect(201);

    const body = response.body as IControllerResponse<IUserResult>;

    expect(body.message).toBe('User registered successfully');
    expect(body.result).toMatchObject({
      email: user.email,
      username: user.username,
    });
    expect(body.result.id).toEqual(expect.any(String));

    return body.result;
  };

  const login = async (user: ITestUser): Promise<ILoginResult> => {
    const response = await request(app.getHttpServer())
      .post('/api/authentication/login')
      .send({
        password: user.password,
        username: user.username,
      })
      .expect(200);

    const body = response.body as IControllerResponse<ILoginResult>;

    expect(body.message).toBe('User logged in successfully');
    expect(body.result.accessToken).toEqual(expect.any(String));
    expect(body.result.refreshToken).toEqual(expect.any(String));

    return body.result;
  };

  it('registers, logs in, returns the authenticated profile, and permits self user access', async () => {
    const user = makeUniqueUser('happy-path');
    const registeredUser = await register(user);
    const tokens = await login(user);

    const profileResponse = await request(app.getHttpServer())
      .get('/api/authentication/profile')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    const profileBody = profileResponse.body as IControllerResponse<IUserResult>;

    expect(profileBody.message).toBe('Authenticated user profile has been retrieved successfully');
    expect(profileBody.result).toMatchObject({
      email: user.email,
      id: registeredUser.id,
      username: user.username,
    });

    const ownUserResponse = await request(app.getHttpServer())
      .get(`/api/users/${registeredUser.id}`)
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    const ownUserBody = ownUserResponse.body as IControllerResponse<IUserResult>;

    expect(ownUserBody.message).toBe('User has been retrieved successfully');
    expect(ownUserBody.result).toMatchObject({
      email: user.email,
      id: registeredUser.id,
      username: user.username,
    });
  });

  it('rejects replayed refresh tokens and revokes the whole token family', async () => {
    const user = makeUniqueUser('refresh-rotation');

    await register(user);

    const originalTokens = await login(user);

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/authentication/refresh')
      .send({
        refreshToken: originalTokens.refreshToken,
      })
      .expect(200);

    const refreshBody = refreshResponse.body as IControllerResponse<ILoginResult>;

    expect(refreshBody.message).toBe('Token refreshed successfully');
    expect(refreshBody.result.accessToken).toEqual(expect.any(String));
    expect(refreshBody.result.refreshToken).toEqual(expect.any(String));
    expect(refreshBody.result.refreshToken).not.toBe(originalTokens.refreshToken);

    const replayResponse = await request(app.getHttpServer())
      .post('/api/authentication/refresh')
      .send({
        refreshToken: originalTokens.refreshToken,
      })
      .expect(401);

    const replayBody = replayResponse.body as IErrorResponse;

    expect(replayBody).toMatchObject({
      data: null,
      errorCode: ERROR_CODE.AUTH_REFRESH_REUSED,
      path: '/api/authentication/refresh',
      statusCode: 401,
    });
    expect(replayBody.message).toEqual(expect.any(String));
    expect(replayBody.timestamp).toEqual(expect.any(String));

    const familyRevokedResponse = await request(app.getHttpServer())
      .post('/api/authentication/refresh')
      .send({
        refreshToken: refreshBody.result.refreshToken,
      })
      .expect(401);

    const familyRevokedBody = familyRevokedResponse.body as IErrorResponse;

    expect(familyRevokedBody).toMatchObject({
      data: null,
      errorCode: ERROR_CODE.AUTH_REFRESH_REUSED,
      path: '/api/authentication/refresh',
      statusCode: 401,
    });
  });
});
