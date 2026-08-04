// Dotenv
import 'dotenv/config';

// Strategies
import { SnakeNamingStrategy } from './snake-naming.strategy';

// TypeORM
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';

/**
 * @description Initialize the DataSource with the options.
 *
 * This DataSource is the one the TypeORM CLI loads via `-d`. It is deliberately
 * NOT the one the running app uses — that is built in `postgres-provider.module.ts`
 * from the Nest config services. Both must describe the same schema, so the two
 * settings that decide schema shape are duplicated here on purpose:
 *
 * - `entities` — without it the CLI sees zero entities and `migration:generate`
 *   emits an empty migration, which is what silently happened before.
 * - `namingStrategy` — omitting it would make the CLI read `username` where the app
 *   writes `user_name`, so every generated migration would rename columns back and
 *   forth forever.
 */
const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ? +process.env.DATABASE_PORT : 5432,
  database: process.env.DATABASE_NAME,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/postgres/migrations/*{.ts,.js}'],
  namingStrategy: new SnakeNamingStrategy(),
  seeds: ['src/database/postgres/seeders/*{.ts,.js}'],
  factories: [],
};

export default new DataSource(options);
