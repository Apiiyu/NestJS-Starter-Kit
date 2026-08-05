// Crypto
import { createHash } from 'node:crypto';

// NestJS Libraries
import type { Cache } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

const LIST_INDEX_KEY = 'users:list:index';
const LIST_TTL_MS = 60_000;

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

  public idKey(id: string, withDeleted: boolean): string {
    return `users:id:${id}:${withDeleted}`;
  }

  public usernameKey(username: string): string {
    return `users:username:${username}`;
  }

  public emailKey(email: string): string {
    return `users:email:${email}`;
  }

  public async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this._cache.get<T>(key);
    } catch (error: unknown) {
      this._logger.warn(`Cache get failed for "${key}": ${(error as Error).message}`);

      return undefined;
    }
  }

  public async set<T>(key: string, value: T): Promise<void> {
    try {
      await this._cache.set(key, value, LIST_TTL_MS);
    } catch (error: unknown) {
      this._logger.warn(`Cache set failed for "${key}": ${(error as Error).message}`);
    }
  }

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

  public async invalidateLists(): Promise<void> {
    try {
      const index = (await this._cache.get<string[]>(LIST_INDEX_KEY)) ?? [];

      await this._cache.mdel([...index, LIST_INDEX_KEY]);
    } catch (error: unknown) {
      this._logger.warn(`Cache invalidateLists failed: ${(error as Error).message}`);
    }
  }
}
