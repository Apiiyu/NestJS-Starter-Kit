import { UnauthorizedException } from '@nestjs/common';

import type { AuthenticationService } from '../../modules/authentication/services/authentication.service';
import type { UsersEntity } from '../../modules/users/entities/users.entity';
import { USER_ROLE } from '../constants/role.constant';
import { LocalStrategy } from './local.strategy';

const user = {
  email: 'test@test.com',
  id: 'user-1',
  role: USER_ROLE.USER,
  username: 'tester',
} as UsersEntity;

describe('LocalStrategy', () => {
  const validateUser = jest.fn();
  const strategy = new LocalStrategy({ validateUser } as unknown as AuthenticationService);

  beforeEach(() => jest.clearAllMocks());

  it('hands the credentials to the authentication service', async () => {
    validateUser.mockResolvedValue(user);

    await strategy.validate('tester', 'secret');

    expect(validateUser).toHaveBeenCalledWith('tester', 'secret');
  });

  it('returns the user the service validated', async () => {
    validateUser.mockResolvedValue(user);

    await expect(strategy.validate('tester', 'secret')).resolves.toBe(user);
  });

  /**
   * `validateUser` resolving to null is not an error path inside the service, so if the
   * strategy passed it through, passport would treat the request as authenticated with
   * an empty user and every downstream `req.user.id` would be undefined.
   */
  it('rejects when the service resolves nothing', async () => {
    validateUser.mockResolvedValue(null);

    await expect(strategy.validate('tester', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
