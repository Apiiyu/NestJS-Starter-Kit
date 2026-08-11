// Constants
import { LIST_INDEX_KEY, LIST_TTL_MS } from '../constants/users.constant';

// NestJS Libraries
import type { Cache } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

// Node Libraries
import { createHash } from 'node:crypto';

/**
 * @description Named, invalidatable cache keys for `UsersService` (D11) — replaces the
 * anonymous `.cache(true)` query cache that had no handle a write could evict.
 *
 * List entries are tracked in `LIST_INDEX_KEY` because a list key is derived from its
 * filter params, so there is no single fixed key to delete on write — every write has
 * to be able to clear every filter variant that might be cached. The read-then-write on
 * that index is not atomic; two requests populating two different list keys at the same
 * instant could race and one addition could be lost. Worst case is one stale filter
 * variant surviving up to `LIST_TTL_MS`, which self-heals — an acceptable trade for
 * avoiding a second moving part (e.g. a Lua script) in a starter kit.
 *
 * Every Redis-touching method is fail-open: a cache outage logs a warning and falls
 * through to a safe default (a miss, or a no-op write) rather than throwing. The
 * `cache:` block this replaced set `ignoreErrors: true` for exactly this reason — Redis
 * being down must never take the database read path down with it.
 */
@Injectable()
export class UsersCacheService {
  private readonly _logger = new Logger(UsersCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly _cache: Cache) {}

  /**
   * @description Cache key for a lookup by email address.
   *
   * @param email The address the row was looked up by.
   */
  public emailKey(email: string): string {
    return `users:email:${email}`;
  }

  /**
   * @description Reads one entry, returning undefined on a miss.
   *
   * Fail-open: a Redis outage is logged and reported as a miss, so the caller falls through to
   * the database instead of the whole read path failing with it.
   *
   * @param key The cache key, built by one of the `*Key` methods on this class.
   */
  public async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this._cache.get<T>(key);
    } catch (error: unknown) {
      this._logger.warn(`Cache get failed for "${key}": ${(error as Error).message}`);

      return undefined;
    }
  }

  /**
   * @description Cache key for a lookup by primary key.
   *
   * `withDeleted` is part of the key because the same ID answers differently depending on it —
   * folding the two together would let a soft-deleted row be served to a caller that asked
   * only for live ones.
   *
   * @param id The user's UUID.
   * @param withDeleted Whether the query that produced the row included soft-deleted rows.
   */
  public idKey(id: string, withDeleted: boolean): string {
    return `users:id:${id}:${withDeleted}`;
  }

  /**
   * @description Drops every cached list, along with the index that tracked them.
   *
   * Called after any write. A write can change which rows match which filter, and there is no
   * way to know which cached filter variants are affected — so all of them go.
   */
  public async invalidateLists(): Promise<void> {
    try {
      const index = (await this._cache.get<string[]>(LIST_INDEX_KEY)) ?? [];

      await this._cache.mdel([...index, LIST_INDEX_KEY]);
    } catch (error: unknown) {
      this._logger.warn(`Cache invalidateLists failed: ${(error as Error).message}`);
    }
  }

  /**
   * @description Drops the single-user entries a write invalidated.
   *
   * Takes several keys because one user is cached under all of id, username, and email, and a
   * write to any field must clear every entry pointing at that row. Null and undefined entries
   * are filtered out so callers can pass keys for fields the user may not have.
   *
   * @param keys Candidate keys, possibly containing null or undefined.
   */
  public async invalidateUser(keys: Array<string | null | undefined>): Promise<void> {
    const targets = keys.filter((key): key is string => Boolean(key));

    if (!targets.length) {
      return;
    }

    try {
      await this._cache.mdel(targets);
    } catch (error: unknown) {
      this._logger.warn(`Cache invalidateUser failed: ${(error as Error).message}`);
    }
  }

  /**
   * @description Cache key for a filtered list, derived from the filters themselves.
   *
   * Filters are sorted before hashing so that two requests differing only in parameter order
   * hit the same entry rather than caching the same page twice.
   *
   * @param filters The list query parameters as they arrived.
   */
  public listKey(filters: Record<string, unknown>): string {
    /**
     * `Object.fromEntries` rather than assigning into an accumulator. A filter key of
     * `__proto__` — reachable, since these come from the query string — would be swallowed
     * by `acc[key] = ...` as a prototype assignment instead of becoming a key, so two
     * different filter sets would serialise identically and collide on one cache entry.
     * fromEntries defines own properties, which keeps the key faithful to the input.
     */
    const sorted = Object.fromEntries(
      Object.entries(filters).sort(([left], [right]) => left.localeCompare(right)),
    );

    return `users:list:${createHash('sha1').update(JSON.stringify(sorted)).digest('hex')}`;
  }

  /**
   * @description Writes one entry with the standard TTL. Fail-open — a cache outage logs a
   * warning and the write is skipped.
   *
   * @param key The cache key.
   * @param value The value to store; it is serialised, so it comes back without its prototype.
   */
  public async set<T>(key: string, value: T): Promise<void> {
    try {
      await this._cache.set(key, value, LIST_TTL_MS);
    } catch (error: unknown) {
      this._logger.warn(`Cache set failed for "${key}": ${(error as Error).message}`);
    }
  }

  /**
   * @description Writes a list entry and records its key in the index.
   *
   * The index is what makes list invalidation possible: without it there is no way to find the
   * filter variants that need clearing after a write.
   *
   * @param key The list cache key from `listKey`.
   * @param value The page to store.
   */
  public async setList<T>(key: string, value: T): Promise<void> {
    try {
      await this._cache.set(key, value, LIST_TTL_MS);

      const index = (await this._cache.get<string[]>(LIST_INDEX_KEY)) ?? [];

      if (!index.includes(key)) {
        await this._cache.set(LIST_INDEX_KEY, [...index, key]);
      }
    } catch (error: unknown) {
      this._logger.warn(`Cache setList failed for "${key}": ${(error as Error).message}`);
    }
  }

  /**
   * @description Cache key for a lookup by username.
   *
   * @param username The username the row was looked up by.
   */
  public usernameKey(username: string): string {
    return `users:username:${username}`;
  }
}
