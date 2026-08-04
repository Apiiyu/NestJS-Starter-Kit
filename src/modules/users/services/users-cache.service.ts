// Crypto
import { createHash } from 'node:crypto';

// NestJS Libraries
import type { Cache } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

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
 */
@Injectable()
export class UsersCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly _cache: Cache) {}

  public listKey(filters: Record<string, unknown>): string {
    const sorted = Object.keys(filters)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = filters[key];
        return acc;
      }, {});

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
    return this._cache.get<T>(key);
  }

  public async set<T>(key: string, value: T): Promise<void> {
    await this._cache.set(key, value, LIST_TTL_MS);
  }

  public async setList<T>(key: string, value: T): Promise<void> {
    await this.set(key, value);

    const index = (await this._cache.get<string[]>(LIST_INDEX_KEY)) ?? [];

    if (!index.includes(key)) {
      await this._cache.set(LIST_INDEX_KEY, [...index, key]);
    }
  }

  public async invalidateUser(keys: Array<string | null | undefined>): Promise<void> {
    const targets = keys.filter((key): key is string => Boolean(key));

    if (targets.length) {
      await this._cache.mdel(targets);
    }
  }

  public async invalidateLists(): Promise<void> {
    const index = (await this._cache.get<string[]>(LIST_INDEX_KEY)) ?? [];

    await this._cache.mdel([...index, LIST_INDEX_KEY]);
  }
}
