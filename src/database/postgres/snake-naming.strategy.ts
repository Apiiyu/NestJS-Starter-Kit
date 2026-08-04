// TypeORM
import { DefaultNamingStrategy } from 'typeorm';
import type { NamingStrategyInterface } from 'typeorm';

/**
 * @description Converts a string to snake_case.
 *
 * Replaces TypeORM's internal `StringUtils.snakeCase`, which v1 no longer exposes.
 * Handles camelCase, PascalCase, and consecutive capitals: `userID` -> `user_id`,
 * `HTTPResponse` -> `http_response`.
 */
function snakeCase(value: string): string {
  return value
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * @description Converts camelCase property names to snake_case database identifiers.
 *
 * Inlined from the `typeorm-naming-strategies` package, which is incompatible with
 * TypeORM v1: it imports `snakeCase` from the internal path `typeorm/util/StringUtils`
 * and overrides interface methods that v1 removed. The package has been unmaintained
 * since 2022, so there is no upstream fix to wait for.
 *
 * Columns that declare an explicit `name:` in their decorator bypass this strategy
 * entirely, which is why the base entity's timestamps stay camelCase in the database.
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  public columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    const prefix = embeddedPrefixes.map((p) => snakeCase(p)).join('_');
    const name = customName ?? snakeCase(propertyName);

    return prefix ? `${prefix}_${name}` : name;
  }

  public joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  public joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }

  public joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return snakeCase(
      `${firstTableName}_${firstPropertyName.replace(/\./gi, '_')}_${secondTableName}`,
    );
  }

  public relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  public tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? snakeCase(targetName);
  }
}
