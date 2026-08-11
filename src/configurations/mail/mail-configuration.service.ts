// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * @description Typed read access to the SMTP settings the mail transport is built from.
 *
 * The defaults describe the Mailpit container `bun run dev:up` starts, so a developer who has
 * configured nothing still gets working local mail delivered to a catch-all inbox rather than
 * an authentication failure against a real provider.
 */
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
