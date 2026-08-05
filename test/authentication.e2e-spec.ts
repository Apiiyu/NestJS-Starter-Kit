// Constants
import { ERROR_CODE } from '../src/common/constants/error-code.constant';

// Crypto
import { randomUUID } from 'node:crypto';

// Bootstrap
import { configureApp } from '../src/common/bootstrap/configure-app';

// Modules
import { AppModule } from '../src/app.module';

// NestJS Libraries
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Supertest
import request from 'supertest';

interface IControllerResponse<T> {
  data: T;
  message: string;
  statusCode: number;
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

/**
 * Kept short on purpose. RFC 5321 caps an address's local part at 64 characters and
 * `@IsEmail()` enforces it, so a longer unique suffix makes every fixture invalid — which
 * went unnoticed while the suite ran without a ValidationPipe. Base-36 timestamps plus a
 * slice of a uuid stay unique across parallel runs in a fraction of the width.
 */
const makeUniqueUser = (label: string): ITestUser => {
  const uniqueValue = `${Date.now().toString(36)}${process.pid.toString(36)}${randomUUID().slice(0, 8)}`;

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
    // The same globals main.ts applies. Without this the suite runs an application with
    // no ValidationPipe, no response interceptor and no versioning — see configure-app.ts.
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (user: ITestUser): Promise<IUserResult> => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/authentication/register')
      .send(user)
      .expect(201);

    const body = response.body as IControllerResponse<IUserResult>;

    expect(body.message).toBe('User registered successfully');
    expect(body.data).toMatchObject({
      email: user.email,
      username: user.username,
    });
    expect(body.data.id).toEqual(expect.any(String));

    return body.data;
  };

  const login = async (user: ITestUser): Promise<ILoginResult> => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/authentication/login')
      .send({
        password: user.password,
        username: user.username,
      })
      .expect(200);

    const body = response.body as IControllerResponse<ILoginResult>;

    expect(body.message).toBe('User logged in successfully');
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.refreshToken).toEqual(expect.any(String));

    return body.data;
  };

  it('registers, logs in, returns the authenticated profile, and permits self user access', async () => {
    const user = makeUniqueUser('happy-path');
    const registeredUser = await register(user);
    const tokens = await login(user);

    const profileResponse = await request(app.getHttpServer())
      .get('/api/v1/authentication/profile')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    const profileBody = profileResponse.body as IControllerResponse<IUserResult>;

    expect(profileBody.message).toBe('Authenticated user profile has been retrieved successfully');
    expect(profileBody.data).toMatchObject({
      email: user.email,
      id: registeredUser.id,
      username: user.username,
    });

    const ownUserResponse = await request(app.getHttpServer())
      .get(`/api/v1/users/${registeredUser.id}`)
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    const ownUserBody = ownUserResponse.body as IControllerResponse<IUserResult>;

    expect(ownUserBody.message).toBe('User has been retrieved successfully');
    expect(ownUserBody.data).toMatchObject({
      email: user.email,
      id: registeredUser.id,
      username: user.username,
    });
  });

  it.each([
    ['too short', 'P@ss1'],
    ['missing an uppercase letter', 'p@ssword12345'],
    ['missing a lowercase letter', 'P@SSWORD12345'],
    ['missing both a digit and a special character', 'PasswordOnlyLetters'],
    ['longer than bcrypt can hash', `P@ss1${'a'.repeat(80)}`],
  ])('refuses to register a password that is %s', async (_label, password) => {
    const user = { ...makeUniqueUser('weak-password'), password };

    const response = await request(app.getHttpServer())
      .post('/api/v1/authentication/register')
      .send(user)
      .expect(400);

    const body = response.body as IErrorResponse;

    expect(body.statusCode).toBe(400);
    expect(JSON.stringify(body)).toContain('password');
  });

  it('rejects replayed refresh tokens and revokes the whole token family', async () => {
    const user = makeUniqueUser('refresh-rotation');

    await register(user);

    const originalTokens = await login(user);

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/authentication/refresh')
      .send({
        refreshToken: originalTokens.refreshToken,
      })
      .expect(200);

    const refreshBody = refreshResponse.body as IControllerResponse<ILoginResult>;

    expect(refreshBody.message).toBe('Token refreshed successfully');
    expect(refreshBody.data.accessToken).toEqual(expect.any(String));
    expect(refreshBody.data.refreshToken).toEqual(expect.any(String));
    expect(refreshBody.data.refreshToken).not.toBe(originalTokens.refreshToken);

    const replayResponse = await request(app.getHttpServer())
      .post('/api/v1/authentication/refresh')
      .send({
        refreshToken: originalTokens.refreshToken,
      })
      .expect(401);

    const replayBody = replayResponse.body as IErrorResponse;

    expect(replayBody).toMatchObject({
      data: null,
      errorCode: ERROR_CODE.AUTH_REFRESH_REUSED,
      path: '/api/v1/authentication/refresh',
      statusCode: 401,
    });
    expect(replayBody.message).toEqual(expect.any(String));
    expect(replayBody.timestamp).toEqual(expect.any(String));

    const familyRevokedResponse = await request(app.getHttpServer())
      .post('/api/v1/authentication/refresh')
      .send({
        refreshToken: refreshBody.data.refreshToken,
      })
      .expect(401);

    const familyRevokedBody = familyRevokedResponse.body as IErrorResponse;

    expect(familyRevokedBody).toMatchObject({
      data: null,
      errorCode: ERROR_CODE.AUTH_REFRESH_REUSED,
      path: '/api/v1/authentication/refresh',
      statusCode: 401,
    });
  });
});
