import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ListOptionDto } from '../../../common/dtos/list-options.dto';
import { UsersEntity } from '../entities/users.entity';
import { UsersService } from './users.service';

const mockUser: Partial<UsersEntity> = {
  id: 'uuid-1',
  username: 'testuser',
  email: 'test@test.com',
  password: 'hashed',
  deletedAt: null,
};

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
