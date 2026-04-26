// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
