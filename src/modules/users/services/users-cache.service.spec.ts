import { UsersCacheService } from './users-cache.service';

describe('UsersCacheService', () => {
  const mockCache = { get: jest.fn(), set: jest.fn(), mdel: jest.fn() };
  let service: UsersCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersCacheService(mockCache as never);
  });

  describe('key builders', () => {
    it('builds the same list key regardless of filter property order', () => {
      expect(service.listKey({ a: 1, b: 2 })).toBe(service.listKey({ b: 2, a: 1 }));
    });

    it('builds distinct keys per identity dimension', () => {
      const keys = new Set([
        service.idKey('1', false),
        service.idKey('1', true),
        service.usernameKey('1'),
        service.emailKey('1'),
      ]);

      expect(keys.size).toBe(4);
    });
  });

  describe('setList', () => {
    it('adds the key to the list index once', async () => {
      mockCache.get.mockResolvedValueOnce(undefined);

      await service.setList('users:list:abc', { data: [] });

      expect(mockCache.set).toHaveBeenCalledWith('users:list:abc', { data: [] }, 60_000);
      expect(mockCache.set).toHaveBeenCalledWith('users:list:index', ['users:list:abc']);
    });

    it('does not duplicate an already-indexed key', async () => {
      mockCache.get.mockResolvedValueOnce(['users:list:abc']);

      await service.setList('users:list:abc', { data: [] });

      expect(mockCache.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateUser', () => {
    it('deletes only the defined keys', async () => {
      await service.invalidateUser(['users:id:1:false', null, undefined, 'users:username:x']);

      expect(mockCache.mdel).toHaveBeenCalledWith(['users:id:1:false', 'users:username:x']);
    });

    it('skips the delete call when every key is empty', async () => {
      await service.invalidateUser([null, undefined]);

      expect(mockCache.mdel).not.toHaveBeenCalled();
    });
  });

  /**
   * The `cache:` block this replaced set `ignoreErrors: true` specifically so a Redis
   * outage could never take the database read path down with it. These pin the same
   * guarantee on the new named-key cache.
   */
  describe('fail-open on cache errors', () => {
    it('get resolves undefined instead of throwing', async () => {
      mockCache.get.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.get('users:id:1:false')).resolves.toBeUndefined();
    });

    it('set resolves instead of throwing', async () => {
      mockCache.set.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.set('users:id:1:false', {})).resolves.toBeUndefined();
    });

    it('setList resolves instead of throwing', async () => {
      mockCache.set.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.setList('users:list:abc', { data: [] })).resolves.toBeUndefined();
    });

    it('invalidateUser resolves instead of throwing', async () => {
      mockCache.mdel.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.invalidateUser(['users:id:1:false'])).resolves.toBeUndefined();
    });

    it('invalidateLists resolves instead of throwing', async () => {
      mockCache.get.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.invalidateLists()).resolves.toBeUndefined();
    });
  });

  describe('invalidateLists', () => {
    it('deletes every indexed list key plus the index itself', async () => {
      mockCache.get.mockResolvedValueOnce(['users:list:a', 'users:list:b']);

      await service.invalidateLists();

      expect(mockCache.mdel).toHaveBeenCalledWith([
        'users:list:a',
        'users:list:b',
        'users:list:index',
      ]);
    });

    it('still clears the index when nothing was tracked', async () => {
      mockCache.get.mockResolvedValueOnce(undefined);

      await service.invalidateLists();

      expect(mockCache.mdel).toHaveBeenCalledWith(['users:list:index']);
    });
  });
});
