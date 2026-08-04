import { ForbiddenException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { USER_ROLE } from '../../../common/constants/role.constant';
import { ListOptionDto } from '../../../common/dtos/list-options.dto';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';

const ADMIN: IRequestUser = {
  email: 'admin@test.com',
  id: 'admin-id',
  role: USER_ROLE.ADMIN,
  username: 'admin',
};

const MEMBER: IRequestUser = {
  email: 'member@test.com',
  id: 'member-id',
  role: USER_ROLE.USER,
  username: 'member',
};

const requestAs = (user: IRequestUser): ICustomRequestHeaders =>
  ({ user }) as unknown as ICustomRequestHeaders;

const mockUsersService = {
  delete: jest.fn().mockResolvedValue({ id: 'member-id' }),
  findAll: jest.fn().mockResolvedValue({ content: [], meta: {} }),
  findOneById: jest.fn().mockResolvedValue({ id: 'member-id' }),
  restore: jest.fn().mockResolvedValue({ id: 'member-id' }),
  update: jest.fn().mockResolvedValue({ id: 'member-id' }),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns the paginated list', async () => {
      const filters = new ListOptionDto();

      const response = await controller.findAll(filters);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(filters);
      expect(response.message).toBe('Users have been retrieved successfully');
    });
  });

  /**
   * Role checks live in `RolesGuard`, which cannot answer "is this your own record" —
   * it has no idea which record a route is about. That question is settled here, so
   * these are the tests that keep one user from reading another.
   */
  describe('findOne', () => {
    it('lets a user read their own record', async () => {
      await expect(controller.findOne('member-id', requestAs(MEMBER))).resolves.toHaveProperty(
        'result',
      );
    });

    it('lets an admin read anyone', async () => {
      await expect(controller.findOne('member-id', requestAs(ADMIN))).resolves.toHaveProperty(
        'result',
      );
    });

    it('stops a user reading somebody else', async () => {
      await expect(controller.findOne('other-id', requestAs(MEMBER))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('does not reach the service when it denies', async () => {
      await controller.findOne('other-id', requestAs(MEMBER)).catch(() => null);

      expect(mockUsersService.findOneById).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('lets a user update themselves', async () => {
      await controller.update('member-id', { username: 'renamed' }, requestAs(MEMBER));

      expect(mockUsersService.update).toHaveBeenCalledWith(
        'member-id',
        { username: 'renamed' },
        MEMBER,
      );
    });

    it('stops a user updating somebody else', async () => {
      await expect(
        controller.update('other-id', { username: 'hijack' }, requestAs(MEMBER)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('passes the requesting user through for the audit trail', async () => {
      await controller.delete('member-id', requestAs(ADMIN));

      expect(mockUsersService.delete).toHaveBeenCalledWith('member-id', ADMIN);
    });
  });

  describe('restore', () => {
    it('passes the requesting user through for the audit trail', async () => {
      await controller.restore('member-id', requestAs(ADMIN));

      expect(mockUsersService.restore).toHaveBeenCalledWith('member-id', ADMIN);
    });
  });
});
