/* Local mail transport.
 *
 * LionPost sends exactly one kind of mail — the password reset link — and the
 * sandbox has no SMTP, so the default transport prints the message to the
 * server log and keeps the last few in memory for tests and the dev inbox.
 * Swap `send` for a real provider (Resend, SES, Postmark) in production.
 */
const OUTBOX_MAX = 25;
const outbox = [];

export function outboxItems() {
  return outbox.slice();
}

export function clearOutbox() {
  outbox.length = 0;
}

/**
 * @param {{to: string, subject: string, text: string, link?: string}} message
 */
export function send(message) {
  const mail = {
    id: outbox.length + 1,
    to: message.to,
    subject: message.subject,
    text: message.text,
    link: message.link || null,
    sentAt: new Date().toISOString(),
  };
  outbox.push(mail);
  if (outbox.length > OUTBOX_MAX) outbox.shift();
  if (process.env.LIONPOST_LOG !== '0') {
    const line = `[mail] to=${mail.to} subject="${mail.subject}"` + (mail.link ? ` link=${mail.link}` : '');
    console.log(line);
  }
  return mail;
}
