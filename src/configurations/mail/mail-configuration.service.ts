// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailConfigService {
  constructor(private readonly _configService: ConfigService) {}

  get mailHost(): string {
    return this._configService.get<string>('mail.host') ?? 'localhost';
  }

  get mailPort(): number {
    return Number(this._configService.get<string>('mail.port') ?? '587');
  }

  get mailUser(): string {
    return this._configService.get<string>('mail.user') ?? '';
  }

  get mailPassword(): string {
    return this._configService.get<string>('mail.password') ?? '';
  }

  get mailFrom(): string {
    return this._configService.get<string>('mail.from') ?? 'noreply@example.com';
  }
}
