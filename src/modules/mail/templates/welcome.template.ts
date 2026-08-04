export interface IRenderedEmail {
  subject: string;
  html: string;
}

/**
 * @description `RegisterEmailDto.username` only enforces `@IsString()` and
 * `@MaxLength(100)` — no character whitelist — so it can contain HTML. Escaping here
 * is what keeps a username like `<img src=x onerror=...>` from executing in whatever
 * renders this email.
 */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const renderWelcomeEmail = (username: string): IRenderedEmail => ({
  subject: 'Welcome aboard',
  html: `<p>Hi ${escapeHtml(username)},</p><p>Your account has been created. Welcome aboard!</p>`,
});
