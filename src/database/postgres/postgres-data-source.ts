// Dotenv
import 'dotenv/config';

// TypeORM
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';

/**
 * @description Initialize the DataSource with the options.
 */
const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ? +process.env.DATABASE_PORT : 5432,
  database: process.env.DATABASE_NAME,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  seeds: ['src/database/postgres/seeders/*{.ts,.js}'],
  factories: [],
};

export default new DataSource(options);
