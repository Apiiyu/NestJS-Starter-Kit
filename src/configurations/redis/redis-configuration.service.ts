// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
}
