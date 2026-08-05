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

      /**
       * `Object.hasOwn` rather than a truthiness check on the lookup. `column` comes
       * straight from the query string, and a plain `permitColumns[column]` also finds
       * inherited members: `?sortBy=constructor|asc` resolves to a truthy function, which
       * then reaches `orderBy()` as if it were a permitted column name. Own properties
       * only is what makes this map an allowlist rather than a suggestion.
       */
      if (column && Object.hasOwn(permitColumns, column)) {
        // eslint-disable-next-line security/detect-object-injection -- guarded above.
        queryBuilder.orderBy(permitColumns[column], sortDirection as 'ASC' | 'DESC');
      }
    }
  });

  return queryBuilder;
};
