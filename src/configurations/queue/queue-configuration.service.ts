// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * @description Typed read access to the connection settings for the queue's Redis instance.
 *
 * Deliberately separate from `RedisConfigService`: the two point at different servers, and
 * collapsing them would put jobs on the cache instance, where eviction can delete them.
 */
@Injectable()
export class QueueConfigService {
  constructor(private readonly _configService: ConfigService) {}

  get queueHost(): string {
    return this._configService.get<string>('queue.host') ?? 'localhost';
  }

  get queuePort(): number {
    return Number(this._configService.get<string>('queue.port') ?? '6379');
  }

  get queuePassword(): string {
    return this._configService.get<string>('queue.password') ?? '';
  }
}
