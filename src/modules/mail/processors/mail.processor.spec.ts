import type { Job } from 'bullmq';

import { MAIL_JOB } from '../constants/mail-queue.constant';
import { MailProcessor } from './mail.processor';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const mockMailConfigService = {
  mailFrom: 'noreply@example.com',
  mailHost: 'localhost',
  mailPassword: '',
  mailPort: 1025,
  mailUser: '',
};

describe('MailProcessor', () => {
  let processor: MailProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new MailProcessor(mockMailConfigService as never);
  });

  it('sends the welcome email with an escaped username and the configured from address', async () => {
    await processor.process({
      id: 'job-1',
      name: MAIL_JOB.WELCOME,
      data: { email: 'user@example.com', username: 'user' },
    } as Job);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'user@example.com',
        subject: expect.any(String),
        html: expect.stringContaining('user'),
      }),
    );
  });

  it('skips unknown job names without sending mail', async () => {
    await processor.process({ id: 'job-2', name: 'not-a-real-job', data: {} } as Job);

    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
