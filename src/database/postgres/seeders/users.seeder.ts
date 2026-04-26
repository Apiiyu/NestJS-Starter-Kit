// TypeORM
import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

export default class UsersSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<any> {
    // Run you query here
    await dataSource.query(`
      INSERT INTO
        users (username, email, password)
      VALUES
        ('apiiyu', 'apiiyu@mailnesia.com', '$2b$10$NznZ1UcJLJjBsy4ksxfo6evMDH6b5yIVskohPjjyo4GuubA3sEHbW');
    `);
  }
}
