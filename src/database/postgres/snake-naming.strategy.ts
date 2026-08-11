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
  /**
   * @description Names a column, honouring an explicit `name:` when the decorator supplied one
   * and snake-casing the property otherwise.
   *
   * Embedded entities contribute a prefix so two embedded objects with a field of the same name
   * do not collide on one column.
   *
   * @param propertyName The entity property name.
   * @param customName The explicit name from the column decorator, if any.
   * @param embeddedPrefixes Property path of the embedded entity this column belongs to.
   */
  public columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    const prefix = embeddedPrefixes.map((p) => snakeCase(p)).join('_');
    const name = customName ?? snakeCase(propertyName);

    return prefix ? `${prefix}_${name}` : name;
  }

  /**
   * @description Names the foreign-key column of a relation, as `<relation>_<referenced>`.
   *
   * @param relationName The property name of the relation.
   * @param referencedColumnName The column it points at on the other side.
   */
  public joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  /**
   * @description Names one side's column inside a many-to-many join table.
   *
   * @param tableName The owning table.
   * @param propertyName The property name, used when no column name is given.
   * @param columnName The referenced column name, when known.
   */
  public joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }

  /**
   * @description Names a many-to-many join table after both sides and the owning property.
   *
   * The property name is included because two entities can be related to each other more than
   * once, and the pair of table names alone would produce the same name for both relations.
   *
   * @param firstTableName The owning side's table.
   * @param secondTableName The inverse side's table.
   * @param firstPropertyName The owning side's property, with dots flattened to underscores.
   */
  public joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return snakeCase(
      `${firstTableName}_${firstPropertyName.replace(/\./gi, '_')}_${secondTableName}`,
    );
  }

  /**
   * @description Snake-cases a relation's property name.
   *
   * @param propertyName The relation property as written on the entity.
   */
  public relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  /**
   * @description Names a table, honouring `@Entity('name')` when given and snake-casing the
   * class name otherwise.
   *
   * @param targetName The entity class name.
   * @param userSpecifiedName The explicit table name from the decorator, if any.
   */
  public tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? snakeCase(targetName);
  }
}
