// TypeORM
import type { SelectQueryBuilder } from 'typeorm';

/**
 * @description Applies `sortBy` clauses to a query, accepting only columns the caller has
 * explicitly permitted.
 *
 * The allowlist is the entire point. A sort column taken from the query string and pasted into
 * `orderBy()` is a SQL injection point, because that clause cannot be parameterised — so
 * anything not named in `permitColumns` is refused rather than escaped.
 *
 * @param queryBuilder The query to add ordering to.
 * @param sortBy Raw `column|direction` pairs as they arrived from the client.
 * @param permitColumns Map of accepted client-facing names to their qualified SQL columns.
 */
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
