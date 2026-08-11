/**
 * @description A rendered email, ready to hand to the transport.
 *
 * Subject and body travel together because a template owns both — splitting them invites a
 * caller to pair one template's subject with another's body.
 */
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

/**
 * @description Renders the welcome email sent after registration.
 *
 * The username is HTML-escaped on the way in, because registration does not restrict which
 * characters a username may contain.
 */
export const renderWelcomeEmail = (username: string): IRenderedEmail => ({
  subject: 'Welcome aboard',
  html: `<p>Hi ${escapeHtml(username)},</p><p>Your account has been created. Welcome aboard!</p>`,
});
