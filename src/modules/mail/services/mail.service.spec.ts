import { MAIL_JOB } from '../constants/mail-queue.constant';
import { MailService } from './mail.service';

describe('MailService', () => {
  const mockQueue = { add: jest.fn() };
  let service: MailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MailService(mockQueue as never);
  });

  it('enqueues a welcome email job instead of sending directly', async () => {
    await service.sendWelcomeEmail({ email: 'user@example.com', username: 'user' });

    expect(mockQueue.add).toHaveBeenCalledWith(MAIL_JOB.WELCOME, {
      email: 'user@example.com',
      username: 'user',
    });
  });
});
