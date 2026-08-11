// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * @description Typed read access to the Redis connection settings used by the cache.
 *
 * Every getter carries a fallback so a missing optional variable yields a working local
 * default instead of `undefined` reaching the driver, where it would surface much later as an
 * opaque connection error.
 */
@Injectable()
export class RedisConfigService {
  constructor(private readonly _configService: ConfigService) {}

  get redisHost(): string {
    return this._configService.get<string>('redis.host') ?? 'localhost';
  }

  get redisPort(): number {
    return Number(this._configService.get<string>('redis.port') ?? '6379');
  }

  get redisPassword(): string {
    return this._configService.get<string>('redis.password') ?? '';
  }

  get redisUsername(): string {
    return this._configService.get<string>('redis.username') ?? '';
  }
}
