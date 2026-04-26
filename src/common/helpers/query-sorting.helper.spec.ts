import type { SelectQueryBuilder } from 'typeorm';
import { QuerySortingHelper } from './query-sorting.helper';

const makeBuilder = () => {
  const orderBy = jest.fn().mockReturnThis();
  return { orderBy } as unknown as SelectQueryBuilder<object>;
};

describe('QuerySortingHelper', () => {
  const permitColumns = {
    username: 'users.username',
    email: 'users.email',
  };

  it('orders by a permitted column ASC', () => {
    const qb = makeBuilder();
    QuerySortingHelper(qb, ['username|asc'], permitColumns);
    expect(qb.orderBy).toHaveBeenCalledWith('users.username', 'ASC');
  });

  it('orders by a permitted column DESC', () => {
    const qb = makeBuilder();
    QuerySortingHelper(qb, ['email|desc'], permitColumns);
    expect(qb.orderBy).toHaveBeenCalledWith('users.email', 'DESC');
  });

  it('defaults to ASC for unrecognised direction', () => {
    const qb = makeBuilder();
    QuerySortingHelper(qb, ['username|random'], permitColumns);
    expect(qb.orderBy).toHaveBeenCalledWith('users.username', 'ASC');
  });

  it('ignores columns not in permitColumns', () => {
    const qb = makeBuilder();
    QuerySortingHelper(qb, ['password|asc'], permitColumns);
    expect(qb.orderBy).not.toHaveBeenCalled();
  });

  it('does nothing for an empty sortBy array', () => {
    const qb = makeBuilder();
    QuerySortingHelper(qb, [], permitColumns);
    expect(qb.orderBy).not.toHaveBeenCalled();
  });

  it('returns the query builder', () => {
    const qb = makeBuilder();
    const result = QuerySortingHelper(qb, ['username|asc'], permitColumns);
    expect(result).toBe(qb);
  });
});
