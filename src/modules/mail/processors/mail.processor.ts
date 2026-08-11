// BullMQ
import type { Job } from 'bullmq';

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

// Services
import { MailConfigService } from '../../../configurations/mail/mail-configuration.service';

// Templates
import { renderWelcomeEmail } from '../templates/welcome.template';

/**
 * @description The worker that drains the mail queue and actually sends the email.
 *
 * Sending happens here rather than in the request that triggered it, so a slow or unavailable
 * SMTP server delays delivery instead of failing a user's registration.
 */
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

  /**
   * @description Renders and sends one welcome email.
   *
   * @param data The recipient address and display name carried by the job.
   */
  private async _sendWelcome(data: IWelcomeEmailJob): Promise<void> {
    const { subject, html } = renderWelcomeEmail(data.username);

    await this._transporter.sendMail({
      from: this._mailConfigService.mailFrom,
      to: data.email,
      subject,
      html,
    });
  }

  /**
   * @description BullMQ's entry point: dispatches one job to the handler for its name.
   *
   * An unrecognised name is warned about and skipped rather than thrown on. Throwing would send
   * the job back for retry and it would fail identically every time, eventually filling the
   * dead-letter set with work no version of this processor can ever do.
   *
   * @param job The job to process, named by one of the `MAIL_JOB` values.
   */
  public async process(job: Job<IWelcomeEmailJob>): Promise<void> {
    if (job.name !== MAIL_JOB.WELCOME) {
      this._logger.warn(`Unknown mail job "${job.name}"; skipping.`);
      return;
    }

    await this._sendWelcome(job.data);
    this._logger.log(`Welcome email job ${job.id} sent.`);
  }
}
