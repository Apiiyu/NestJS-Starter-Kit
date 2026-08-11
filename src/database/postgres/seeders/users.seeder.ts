// TypeORM
import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

/**
 * @description Seeds one development user so a fresh clone has something to log in as.
 *
 * Development only. The password hash is committed on purpose and is therefore public — this
 * must never run against an environment that anyone else can reach.
 */
export default class UsersSeeder implements Seeder {
  /**
   * @description Inserts the development user.
   *
   * Raw SQL rather than the repository API because a seeder runs against the CLI data source,
   * outside the Nest DI container, where no repository is available.
   *
   * @param dataSource The CLI data source `bun run seed:run` connects with.
   */
  public async run(dataSource: DataSource): Promise<void> {
    // Run you query here
    await dataSource.query(`
      INSERT INTO
        users (username, email, password)
      VALUES
        ('apiiyu', 'apiiyu@mailnesia.com', '$2b$10$NznZ1UcJLJjBsy4ksxfo6evMDH6b5yIVskohPjjyo4GuubA3sEHbW');
    `);
  }
}
