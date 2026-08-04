// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';
import { ERROR_CODE } from '../../../common/constants/error-code.constant';

// DTOs
import { CreateUserDto } from '../dtos/create-user.dto';
import { ListOptionDto } from '../../../common/dtos/list-options.dto';
import { PaginateDto } from '../../../common/dtos/paginate.dto';
import { PageMetaDto } from '../../../common/dtos/page-meta.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';

// Entities
import { USERS_UNIQUE_INDEX, UsersEntity } from '../entities/users.entity';

// Class Transformer
import { plainToInstance } from 'class-transformer';

// Helpers
import { getUniqueViolationConstraint } from '../../../common/helpers/postgres-error.helper';
import { QuerySortingHelper } from '../../../common/helpers/query-sorting.helper';

// NestJS Libraries
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Services
import { UsersCacheService } from './users-cache.service';

// TypeORM
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

/**
 * @description Maps a violated unique index back to the field a client would
 * recognise. A `Map` rather than an object literal because the key comes from a
 * database error string, and looking that up as an object property is the exact
 * pattern `security/detect-object-injection` exists to flag.
 */
const FIELD_BY_UNIQUE_INDEX = new Map<string, 'email' | 'username'>([
  [USERS_UNIQUE_INDEX.EMAIL, 'email'],
  [USERS_UNIQUE_INDEX.USERNAME, 'username'],
]);

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly _usersRepository: Repository<UsersEntity>,
    private readonly _dataSource: DataSource,
    private readonly _usersCacheService: UsersCacheService,
  ) {}

  /**
   * @description Rehydrate a cached plain object back into a real `UsersEntity`
   * instance.
   *
   * `ClassSerializerInterceptor` (registered globally in `main.ts`) only strips
   * `@Exclude()` fields — `password` here, the audit `*ById` columns on
   * `AppBaseEntity` — from actual class instances. Keyv/Redis round-trips a value
   * through `JSON.stringify`/`JSON.parse`, which drops the prototype chain entirely;
   * returning that plain object straight from a cache hit would silently serve the
   * password hash to the client. `enableImplicitConversion` also restores `Date`
   * fields (`createdAt` etc.) from the ISO strings JSON produced, using the
   * `emitDecoratorMetadata` TypeScript reflection this project already has enabled.
   */
  private _hydrate(plain: UsersEntity): UsersEntity {
    return plainToInstance(UsersEntity, plain, { enableImplicitConversion: true });
  }

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
    const cacheKey = this._usersCacheService.listKey(filters as unknown as Record<string, unknown>);
    const cached = await this._usersCacheService.get<IResultFilter<UsersEntity>>(cacheKey);

    if (cached) {
      return { ...cached, data: cached.data.map((row) => this._hydrate(row)) };
    }

    try {
      this._addRelations(query);

      /**
       * `deletedAt` is a `@DeleteDateColumn`, so TypeORM appends `deletedAt IS NULL`
       * to this query on its own. That implicit clause would make the `isDeleted`
       * branch below unsatisfiable — `IS NULL AND IS NOT NULL` matches no row — and
       * the filter would silently return an empty page instead of the deleted ones.
       * Opting out here keeps the explicit clauses authoritative.
       */
      query.withDeleted();

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

      /**
       * Named cache key (`cacheKey` above, derived from `filters`) rather than the
       * anonymous `.cache(true)` this replaced (D11) — an anonymous query cache keys on
       * the generated SQL with no handle to invalidate, so every write in this service
       * would leave the list serving stale rows for the full cache duration with no way
       * to clear it. `create`/`update`/`delete`/`restore` all call
       * `_usersCacheService.invalidateLists()` after their write succeeds.
       */
      const [data, totalData] = await query.getManyAndCount();
      const total = data.length;
      const result = { data, total, totalData };

      await this._usersCacheService.setList(cacheKey, result);

      return result;
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Translate a Postgres unique violation into a 409, or return quietly
   * when the failure was something else.
   *
   * Called from the `catch` of every write that can collide. The point is that the
   * collision is detected by the database, not by a `findOneByEmail` call beforehand:
   * two concurrent registrations for the same address both read "free", both insert,
   * and the loser gets a 500 from an unhandled index error. Letting the index be the
   * arbiter costs one round trip and is correct under concurrency.
   *
   * `action` exists because the same violated index means different things to a
   * client. During `CREATE` it means "this identity is taken, choose another"; during
   * `RESTORE` it means "an active user already holds the identity of the row you are
   * bringing back", which the client cannot fix by retrying with different input.
   */
  private _throwOnUniqueViolation(error: unknown, action: 'CREATE' | 'RESTORE'): void {
    const constraint = getUniqueViolationConstraint(error);

    if (constraint === null) {
      return;
    }

    const field = FIELD_BY_UNIQUE_INDEX.get(constraint);

    // ? A unique violation on an index we do not own — let the generic handler take it
    if (!field) {
      return;
    }

    if (action === 'RESTORE') {
      throw new ConflictException({
        errorCode: ERROR_CODE.USER_RESTORE_CONFLICT,
        message: `Cannot restore this user because an active user already uses the same ${field}.`,
      });
    }

    throw new ConflictException({
      errorCode: field === 'email' ? ERROR_CODE.USER_EMAIL_TAKEN : ERROR_CODE.USER_USERNAME_TAKEN,
      message: `A user with this ${field} already exists.`,
    });
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
      const saved = await this._usersRepository.save(model);

      // A new row changes every list's result set, whatever its filters.
      await this._usersCacheService.invalidateLists();

      return saved;
    } catch (error: unknown) {
      this._throwOnUniqueViolation(error, 'CREATE');

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

      // Merge Two Entity into single one and save it
      this._usersRepository.merge(selectedUser, {
        deletedAt: new Date(),
      });

      const saved = await this._usersRepository.save(selectedUser, {
        data: {
          action: 'DELETE',
          user,
        },
      });

      await this._usersCacheService.invalidateUser([
        this._usersCacheService.idKey(id, false),
        this._usersCacheService.idKey(id, true),
        this._usersCacheService.usernameKey(saved.username),
        this._usersCacheService.emailKey(saved.email),
      ]);
      await this._usersCacheService.invalidateLists();

      return saved;
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
  public async findOneById(id: string, withDeleted = false): Promise<UsersEntity> {
    const cacheKey = this._usersCacheService.idKey(id, withDeleted);
    const cached = await this._usersCacheService.get<UsersEntity>(cacheKey);

    if (cached) {
      return this._hydrate(cached);
    }

    const user = await this._usersRepository.findOne({
      where: { id },
      withDeleted,
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found.`);
    }

    await this._usersCacheService.set(cacheKey, user);

    return user;
  }

  /**
   * @description Handle business logic for finding a user by username
   */
  public async findOneByUsername(username: string): Promise<UsersEntity | null> {
    const cacheKey = this._usersCacheService.usernameKey(username);
    const cached = await this._usersCacheService.get<UsersEntity>(cacheKey);

    if (cached) {
      return this._hydrate(cached);
    }

    try {
      const user = await this._usersRepository.findOne({
        where: { username },
      });

      /**
       * Only a hit is cached. Caching a miss would risk a just-registered username
       * still reading as "not found" for up to the TTL — a window that would land
       * directly on login, right after the account that needs it was created.
       */
      if (user) {
        await this._usersCacheService.set(cacheKey, user);
      }

      return user;
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
    const cacheKey = this._usersCacheService.emailKey(email);
    const cached = await this._usersCacheService.get<UsersEntity>(cacheKey);

    if (cached) {
      return this._hydrate(cached);
    }

    const user = await this._usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      return null;
    }

    await this._usersCacheService.set(cacheKey, user);

    return user;
  }

  /**
   * @description Handle business logic for restoring a user
   */
  public async restore(id: string, user: IRequestUser): Promise<UsersEntity> {
    try {
      /**
       * The row being restored is by definition soft-deleted, so this lookup has to
       * opt out of the implicit `deletedAt IS NULL` filter that `@DeleteDateColumn`
       * adds — otherwise `restore()` could never find anything and would always
       * throw NotFound.
       */
      const selectedUser = await this.findOneById(id, true);

      // Merge Two Entity into single one and save it
      this._usersRepository.merge(selectedUser, {
        deletedAt: null,
      });

      const saved = await this._usersRepository.save(selectedUser, {
        data: {
          action: 'RESTORE',
          user,
        },
      });

      await this._usersCacheService.invalidateUser([
        this._usersCacheService.idKey(id, false),
        this._usersCacheService.idKey(id, true),
        this._usersCacheService.usernameKey(saved.username),
        this._usersCacheService.emailKey(saved.email),
      ]);
      await this._usersCacheService.invalidateLists();

      return saved;
    } catch (error: unknown) {
      /**
       * Clearing `deletedAt` moves the row back inside the partial unique indexes, so
       * restore is the one operation that can collide with a user who registered the
       * same email after the original was deleted. That is a 409, not a 400.
       */
      this._throwOnUniqueViolation(error, 'RESTORE');

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
    let previousUsername: string | undefined;
    let previousEmail: string | undefined;

    try {
      await this._dataSource.transaction(async (manager: EntityManager) => {
        const selectedUser = await this._usersRepository.findOneOrFail({
          where: {
            id,
          },
        });

        previousUsername = selectedUser.username;
        previousEmail = selectedUser.email;

        // Merge Two Entity into single one and save it
        this._usersRepository.merge(selectedUser, payload);

        await manager.save(selectedUser, {
          data: {
            action: 'UPDATE',
            user,
          },
        });
      });

      /**
       * Both the old and new identity values need invalidating — `username`/`email`
       * can change here (`UpdateUserDto` is a full `PartialType(CreateUserDto)`), and a
       * stale cache entry under either value would outlive this write.
       */
      await this._usersCacheService.invalidateUser([
        this._usersCacheService.idKey(id, false),
        this._usersCacheService.idKey(id, true),
        previousUsername ? this._usersCacheService.usernameKey(previousUsername) : undefined,
        previousEmail ? this._usersCacheService.emailKey(previousEmail) : undefined,
        payload.username ? this._usersCacheService.usernameKey(payload.username) : undefined,
        payload.email ? this._usersCacheService.emailKey(payload.email) : undefined,
      ]);
      await this._usersCacheService.invalidateLists();

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
