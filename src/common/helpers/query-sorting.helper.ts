import type { SelectQueryBuilder } from 'typeorm';

export const QuerySortingHelper = <T extends object>(
  queryBuilder: SelectQueryBuilder<T>,
  sortBy: string[],
  permitColumns: Record<string, string>,
): SelectQueryBuilder<T> => {
  sortBy.forEach((value) => {
    if (value) {
      const [column, direction] = value.split('|');
      const sortDirection = ['asc', 'desc'].includes(direction)
        ? `${direction}`.toUpperCase()
        : 'ASC';

      if (column && permitColumns[column]) {
        queryBuilder.orderBy(permitColumns[column], sortDirection as 'ASC' | 'DESC');
      }
    }
  });

  return queryBuilder;
};
