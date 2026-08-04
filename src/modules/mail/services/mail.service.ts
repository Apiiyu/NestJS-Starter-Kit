// Constants
import { MAIL_JOB, MAIL_QUEUE } from '../constants/mail-queue.constant';

// Interfaces
import type { IWelcomeEmailJob } from '../interfaces/mail.interface';

// NestJS Libraries
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';

// BullMQ
import type { Queue } from 'bullmq';

/**
 * @description Producer only — enqueues jobs and returns. Sending happens in
 * `MailProcessor`, which is what keeps a slow or down SMTP server from holding open the
 * HTTP response that triggered the email (D10).
 */
@Injectable()
export class MailService {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly _queue: Queue) {}

  public async sendWelcomeEmail(job: IWelcomeEmailJob): Promise<void> {
    /**
     * @description BullMQ's default is a single attempt. A welcome email is a courtesy
     * (D10), not a critical notification, but a transient SMTP hiccup shouldn't burn
     * the only try — three attempts with exponential backoff costs nothing and covers
     * the common "server was mid-restart" case.
     */
    await this._queue.add(MAIL_JOB.WELCOME, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    });
  }
}
