// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';

// DTOs
import { CreateUserDto } from '../dtos/create-user.dto';
import { ListOptionDto } from '../../../common/dtos/list-options.dto';
import { PaginateDto } from '../../../common/dtos/paginate.dto';
import { PageMetaDto } from '../../../common/dtos/page-meta.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';

// Entities
import { UsersEntity } from '../entities/users.entity';

// Helpers
import { QuerySortingHelper } from '../../../common/helpers/query-sorting.helper';

// NestJS Libraries
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// TypeORM
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly _usersRepository: Repository<UsersEntity>,
    private readonly _dataSource: DataSource,
  ) {}

  /**
   * @description Handle added relationship
   * @param {SelectQueryBuilder<UsersEntity>} query
   *
   * @returns {void}
   */
  private _addRelations(_query: SelectQueryBuilder<UsersEntity>): void {
    // ? Add relations here
  }

  /**
   * @description Handle business logic for searching users
   */
  private _searchData(filters: ListOptionDto, query: SelectQueryBuilder<UsersEntity>): void {
    query.andWhere(
      `(
        users.username ILIKE :search OR
        users.email ILIKE :search
      )
      ${filters.isDeleted ? '' : 'AND users."deletedAt" IS NULL'}
      `,
      {
        search: `%${filters.search}%`,
      },
    );
  }

  /**
   * @description Handle sorting data
   */
  private _sortData(filters: ListOptionDto, query: SelectQueryBuilder<UsersEntity>): void {
    const permitSort = {
      username: 'users.username',
      email: 'users.email',
    };

    QuerySortingHelper(query, filters.sortBy, permitSort);
  }

  /**
   * @description Handle filters data
   */
  private async _filterData(
    filters: ListOptionDto,
    query: SelectQueryBuilder<UsersEntity>,
  ): Promise<IResultFilter<UsersEntity>> {
    try {
      this._addRelations(query);

      if (filters.search) {
        this._searchData(filters, query);
      }

      if (filters.isDeleted) {
        query.andWhere('users."deletedAt" IS NOT NULL');
      } else {
        query.andWhere('users."deletedAt" IS NULL');
      }

      if (filters.sortBy.length) {
        this._sortData(filters, query);
      }

      if (!filters.disablePaginate) {
        query.take(filters.limit);
        query.skip(filters.skip);
      }

      const [data, totalData] = await query.cache(true).getManyAndCount();
      const total = data.length;

      return {
        data,
        total,
        totalData,
      };
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Handle business logic for creating a user
   */
  public async create(payload: CreateUserDto): Promise<UsersEntity> {
    try {
      const model = new UsersEntity();

      // ? After we initialize the instance of the model, we need to merge the data from the DTO
      this._usersRepository.merge(model, payload);

      // ? Then, we save the model to the database
      return await this._usersRepository.save(model);
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Handle business logic for listing all users
   */
  public async delete(id: string, user: IRequestUser): Promise<UsersEntity> {
    try {
      const selectedUser = await this.findOneById(id);
      const deletedAt = Math.floor(Date.now() / 1000);

      // Merge Two Entity into single one and save it
      this._usersRepository.merge(selectedUser, {
        deletedAt,
      });

      return await this._usersRepository.save(selectedUser, {
        data: {
          action: 'DELETE',
          user,
        },
      });
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Handle find all users
   */
  public async findAll(filters: ListOptionDto): Promise<PaginateDto<UsersEntity>> {
    try {
      const query: SelectQueryBuilder<UsersEntity> =
        this._usersRepository.createQueryBuilder('users');
      const { data, total, totalData } = await this._filterData(filters, query);
      const meta = new PageMetaDto({
        totalData,
        total,
        page: filters.offset ?? 1,
        size: filters.disablePaginate ? totalData : (filters.limit ?? 10),
      });

      return new PaginateDto<UsersEntity>(data, meta);
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Handle business logic for finding a by specific id
   */
  public async findOneById(id: string): Promise<UsersEntity> {
    const user = await this._usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found.`);
    }

    return user;
  }

  /**
   * @description Handle business logic for finding a user by username
   */
  public async findOneByUsername(username: string): Promise<UsersEntity | null> {
    try {
      return await this._usersRepository.findOne({
        where: { username },
      });
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new NotFoundException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Handle business logic for finding a user by email
   */
  public async findOneByEmail(email: string): Promise<UsersEntity | null> {
    const user = await this._usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return user;
  }

  /**
   * @description Handle business logic for restoring a user
   */
  public async restore(id: string, user: IRequestUser): Promise<UsersEntity> {
    try {
      const selectedUser = await this.findOneById(id);

      // Merge Two Entity into single one and save it
      this._usersRepository.merge(selectedUser, {
        deletedAt: null,
      });

      return await this._usersRepository.save(selectedUser, {
        data: {
          action: 'RESTORE',
          user,
        },
      });
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Handle business logic for updating a user
   */
  public async update(
    id: string,
    payload: UpdateUserDto,
    user: IRequestUser,
  ): Promise<UsersEntity> {
    try {
      await this._dataSource.transaction(async (manager: EntityManager) => {
        const selectedUser = await this._usersRepository.findOneOrFail({
          where: {
            id,
          },
        });

        // Merge Two Entity into single one and save it
        this._usersRepository.merge(selectedUser, payload);

        await manager.save(selectedUser, {
          data: {
            action: 'UPDATE',
            user,
          },
        });
      });

      return this.findOneById(id);
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }
}
