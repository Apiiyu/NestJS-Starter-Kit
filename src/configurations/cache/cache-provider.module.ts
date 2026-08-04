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
        const auth = configService.redisPassword
          ? `:${encodeURIComponent(configService.redisPassword)}@`
          : '';

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
