// Constants
import { MAIL_QUEUE } from './constants/mail-queue.constant';

// Modules
import { MailConfigModule } from '../../configurations/mail/mail-configuration.module';

// NestJS Libraries
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

// Processors
import { MailProcessor } from './processors/mail.processor';

// Services
import { MailService } from './services/mail.service';

/**
 * @description Outbound email: the queue, the worker that drains it, and the service callers
 * enqueue through.
 *
 * Only `MailService` is exported, so a caller can ask for an email to be sent but cannot reach
 * the processor or the transport. That is what keeps sending asynchronous — a request never
 * waits on SMTP, and a provider outage delays mail instead of failing the request that
 * triggered it.
 */
@Module({
  imports: [BullModule.registerQueue({ name: MAIL_QUEUE }), MailConfigModule],
  providers: [MailProcessor, MailService],
  exports: [MailService],
})
export class MailModule {}
