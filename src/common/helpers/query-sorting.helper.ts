import type { SelectQueryBuilder } from 'typeorm';

export const QuerySortingHelper = <T extends object>(
  queryBuilder: SelectQueryBuilder<T>,
  sortBy: string[],
  permitColumns: Record<string, string>,
): SelectQueryBuilder<T> => {
  /**
   * A Map, not the record itself. `column` comes straight from the query string, and a
   * plain `permitColumns[column]` also finds inherited members — `?sortBy=constructor|asc`
   * resolves to a truthy function and would reach `orderBy()` as if it were a permitted
   * column. `Object.entries` copies own enumerable properties only, so the Map cannot
   * answer for anything the caller did not explicitly permit.
   */
  const permittedColumns = new Map(Object.entries(permitColumns));

  sortBy.forEach((value) => {
    if (value) {
      const [column, direction] = value.split('|');
      const sortDirection = ['asc', 'desc'].includes(direction)
        ? `${direction}`.toUpperCase()
        : 'ASC';

      // No guard on `column` being empty: `value` is already known non-empty above, and
      // an unmapped or empty name simply misses in the Map.
      const permittedColumn = permittedColumns.get(column);

      if (permittedColumn) {
        queryBuilder.orderBy(permittedColumn, sortDirection as 'ASC' | 'DESC');
      }
    }
  });

  return queryBuilder;
};
