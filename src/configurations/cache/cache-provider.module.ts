// Modules
import { RedisConfigModule } from '../redis/redis-configuration.module';

// NestJS Libraries
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

// Redis
import { createKeyv } from '@keyv/redis';

// Services
import { RedisConfigService } from '../redis/redis-configuration.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [RedisConfigModule],
      useFactory: (configService: RedisConfigService) => {
        /**
         * @description `redis://[[username][:password]@]host:port` — the old TypeORM
         * `cache:` block this replaced passed `username`/`password` as separate ioredis
         * options; folding both into one URL string for `createKeyv` must not drop
         * either. Omitting the username segment on a `REDIS_USERNAME`-configured
         * (ACL-based) instance would send only a password where Redis 6+ ACL expects
         * `AUTH username password`.
         */
        const username = configService.redisUsername
          ? encodeURIComponent(configService.redisUsername)
          : '';
        const password = configService.redisPassword
          ? encodeURIComponent(configService.redisPassword)
          : '';
        const auth = username || password ? `${username}:${password}@` : '';

        return {
          stores: [
            createKeyv(`redis://${auth}${configService.redisHost}:${configService.redisPort}`),
          ],
        };
      },
      inject: [RedisConfigService],
    }),
  ],
})
export class CacheProviderModule {}
