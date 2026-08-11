// Entities
import { USERS_UNIQUE_INDEX } from '../entities/users.entity';

/**
 * @description The cache key holding the set of currently-cached user list keys.
 *
 * A list key is derived from the filter parameters that produced it, so there is no single
 * fixed key a write could delete. This index is what makes invalidation possible at all:
 * every list key that gets populated is recorded here, and a write clears everything the
 * index names.
 */
export const LIST_INDEX_KEY = 'users:list:index';

/**
 * @description How long a cached user list survives, in milliseconds.
 *
 * It doubles as the blast radius of the one race the cache tolerates. Two requests caching
 * two different filter variants at the same instant can lose one addition to the index, and
 * the orphaned variant then stays stale until this expiry removes it.
 */
export const LIST_TTL_MS = 60_000;

/**
 * @description Maps a violated unique index back to the field a client would
 * recognise. A `Map` rather than an object literal because the key comes from a
 * database error string, and looking that up as an object property is the exact
 * pattern `security/detect-object-injection` exists to flag.
 */
export const FIELD_BY_UNIQUE_INDEX = new Map<string, 'email' | 'username'>([
  [USERS_UNIQUE_INDEX.EMAIL, 'email'],
  [USERS_UNIQUE_INDEX.USERNAME, 'username'],
]);
