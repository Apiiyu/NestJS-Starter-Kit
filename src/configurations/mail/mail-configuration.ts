import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  user: process.env.MAIL_USERNAME,
  password: process.env.MAIL_PASSWORD,
  from: process.env.MAIL_FROM,
}));
