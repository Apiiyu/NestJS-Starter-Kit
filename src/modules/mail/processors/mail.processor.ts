// Configurations
import { MailConfigService } from '../../../configurations/mail/mail-configuration.service';

// Constants
import { MAIL_JOB, MAIL_QUEUE } from '../constants/mail-queue.constant';

// Interfaces
import type { IWelcomeEmailJob } from '../interfaces/mail.interface';

// NestJS Libraries
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

// Nodemailer
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Templates
import { renderWelcomeEmail } from '../templates/welcome.template';

// BullMQ
import type { Job } from 'bullmq';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly _logger = new Logger(MailProcessor.name);
  private readonly _transporter: Transporter;

  constructor(private readonly _mailConfigService: MailConfigService) {
    super();
    this._transporter = createTransport({
      host: this._mailConfigService.mailHost,
      port: this._mailConfigService.mailPort,
      auth: this._mailConfigService.mailUser
        ? { user: this._mailConfigService.mailUser, pass: this._mailConfigService.mailPassword }
        : undefined,
    });
  }

  public async process(job: Job<IWelcomeEmailJob>): Promise<void> {
    if (job.name !== MAIL_JOB.WELCOME) {
      this._logger.warn(`Unknown mail job "${job.name}"; skipping.`);
      return;
    }

    await this._sendWelcome(job.data);
    this._logger.log(`Welcome email job ${job.id} sent.`);
  }

  private async _sendWelcome(data: IWelcomeEmailJob): Promise<void> {
    const { subject, html } = renderWelcomeEmail(data.username);

    await this._transporter.sendMail({
      from: this._mailConfigService.mailFrom,
      to: data.email,
      subject,
      html,
    });
  }
}
