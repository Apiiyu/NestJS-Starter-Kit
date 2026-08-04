import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ERROR_CODE } from '../../../common/constants/error-code.constant';
import { ListOptionDto } from '../../../common/dtos/list-options.dto';
import { PG_UNIQUE_VIOLATION } from '../../../common/helpers/postgres-error.helper';
import { USERS_UNIQUE_INDEX, UsersEntity } from '../entities/users.entity';
import { UsersService } from './users.service';

const mockUser: Partial<UsersEntity> = {
  id: 'uuid-1',
  username: 'testuser',
  email: 'test@test.com',
  password: 'hashed',
  deletedAt: null,
};

/**
 * Shaped like what `pg` actually throws through TypeORM: the code and the index name
 * live on `driverError`, not on the wrapper.
 */
const uniqueViolation = (constraint: string): Error =>
  Object.assign(new Error(`duplicate key value violates unique constraint "${constraint}"`), {
    driverError: { code: PG_UNIQUE_VIOLATION, constraint },
  });

/** Await a rejection and hand back the thrown value, so it can be inspected. */
const rejection = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error('Expected the call to reject, but it resolved.');
    },
    (error: unknown) => error,
  );

const mockQb = {
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  cache: jest.fn().mockReturnThis(),
  withDeleted: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
};

const mockRepo = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  merge: jest.fn(),
  save: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UsersEntity), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates and returns a user', async () => {
      mockRepo.merge.mockReturnValue(mockUser);
      mockRepo.save.mockResolvedValue(mockUser);

      const result = await service.create({
        username: 'testuser',
        email: 'test@test.com',
        password: 'pass',
      });
      expect(result).toEqual(mockUser);
    });

    it('throws BadRequestException on failure', async () => {
      mockRepo.save.mockRejectedValue(new Error('DB error'));
      await expect(
        service.create({ username: 'u', email: 'e', password: 'p' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    /**
     * A duplicate is a 409, not a 400. The distinction matters to a client: 400 says
     * "your request is malformed, fix it"; 409 says "the request is fine, the identity
     * is taken". Before the partial unique indexes existed there was no 23505 to catch
     * and every duplicate arrived as a generic 400.
     */
    it('maps a duplicate email to 409 USER_EMAIL_TAKEN', async () => {
      mockRepo.save.mockRejectedValue(uniqueViolation(USERS_UNIQUE_INDEX.EMAIL));

      const error = await rejection(service.create({ username: 'u', email: 'e', password: 'p' }));

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.USER_EMAIL_TAKEN,
      });
    });

    it('maps a duplicate username to 409 USER_USERNAME_TAKEN', async () => {
      mockRepo.save.mockRejectedValue(uniqueViolation(USERS_UNIQUE_INDEX.USERNAME));

      const error = await rejection(service.create({ username: 'u', email: 'e', password: 'p' }));

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.USER_USERNAME_TAKEN,
      });
    });

    // A unique index this service does not own must not be reported as a users conflict.
    it('falls through to BadRequestException for an unrecognised unique index', async () => {
      mockRepo.save.mockRejectedValue(uniqueViolation('UQ_some_other_table_thing'));

      await expect(
        service.create({ username: 'u', email: 'e', password: 'p' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns paginated data', async () => {
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);
      mockQb.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      const filters = new ListOptionDto();
      const result = await service.findAll(filters);
      expect(result.content).toHaveLength(1);
    });
  });

  describe('findOneById', () => {
    it('returns user when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findOneById('uuid-1');
      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundException when user is missing', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneById('uuid-x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOneByUsername', () => {
    it('returns user when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findOneByUsername('testuser');
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.findOneByUsername('nobody');
      expect(result).toBeNull();
    });
  });

  describe('findOneByEmail', () => {
    it('returns user when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findOneByEmail('test@test.com');
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.findOneByEmail('nobody@test.com');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('soft-deletes a user by stamping deletedAt with a Date', async () => {
      const deletedAt = new Date('2026-08-04T09:15:00.000Z');
      mockRepo.findOne.mockResolvedValue(mockUser);
      mockRepo.save.mockResolvedValue({ ...mockUser, deletedAt });

      const requestUser: IRequestUser = { id: 'admin', email: 'a@a.com', username: 'admin' };
      const result = await service.delete('uuid-1', requestUser);

      // Assert on what the service actually wrote, not on the canned save() result —
      // otherwise this test passes even if the merge stamps nothing at all.
      expect(mockRepo.merge).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('restore', () => {
    it('restores a soft-deleted user', async () => {
      mockRepo.findOne.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date('2026-08-04T09:15:00.000Z'),
      });
      mockRepo.save.mockResolvedValue({ ...mockUser, deletedAt: null });

      const requestUser: IRequestUser = { id: 'admin', email: 'a@a.com', username: 'admin' };
      const result = await service.restore('uuid-1', requestUser);
      expect(result.deletedAt).toBeNull();
    });

    it('looks the row up with withDeleted, or it could never find one to restore', async () => {
      mockRepo.findOne.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date('2026-08-04T09:15:00.000Z'),
      });
      mockRepo.save.mockResolvedValue({ ...mockUser, deletedAt: null });

      const requestUser: IRequestUser = { id: 'admin', email: 'a@a.com', username: 'admin' };
      await service.restore('uuid-1', requestUser);

      expect(mockRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ withDeleted: true }));
    });

    /**
     * Restore is the one write that can collide without the caller supplying any new
     * input: clearing `deletedAt` moves the row back inside the partial unique indexes,
     * where somebody who signed up after the delete may already be sitting. It gets its
     * own code because "pick a different email" is not advice the caller can act on.
     */
    it('maps a collision with a live user to 409 USER_RESTORE_CONFLICT', async () => {
      mockRepo.findOne.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date('2026-08-04T09:15:00.000Z'),
      });
      mockRepo.save.mockRejectedValue(uniqueViolation(USERS_UNIQUE_INDEX.EMAIL));

      const requestUser: IRequestUser = { id: 'admin', email: 'a@a.com', username: 'admin' };
      const error = await rejection(service.restore('uuid-1', requestUser));

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.USER_RESTORE_CONFLICT,
      });
    });
  });

  /**
   * `@DeleteDateColumn` makes TypeORM filter soft-deleted rows out implicitly. These
   * two tests pin the explicit opt-outs that keep the delete-aware paths working —
   * both failures would be silent (an empty page, a spurious NotFound) rather than loud.
   */
  describe('soft-delete opt-outs', () => {
    it('findAll opts out of the implicit deletedAt filter', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[mockUser], 1]);

      await service.findAll(new ListOptionDto());

      expect(mockQb.withDeleted).toHaveBeenCalled();
    });

    it('findOneById does not opt out unless asked', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);

      await service.findOneById('uuid-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: false }),
      );
    });
  });
});
