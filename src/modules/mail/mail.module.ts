// Configurations
import { MailConfigModule } from '../../configurations/mail/mail-configuration.module';

// Constants
import { MAIL_QUEUE } from './constants/mail-queue.constant';

// NestJS Libraries
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

// Processors
import { MailProcessor } from './processors/mail.processor';

// Services
import { MailService } from './services/mail.service';

@Module({
  imports: [BullModule.registerQueue({ name: MAIL_QUEUE }), MailConfigModule],
  providers: [MailProcessor, MailService],
  exports: [MailService],
})
export class MailModule {}
