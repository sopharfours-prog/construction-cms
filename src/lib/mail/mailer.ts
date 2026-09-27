import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { getServerEnv } from "@/lib/env/server";

export type MailMessage = { to: string; subject: string; text: string; html?: string };

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const env = getServerEnv();
  transporter = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      })
    : null;
  return transporter;
}

/**
 * Send an email through SMTP.
 *
 * Without SMTP configured: in development the message is printed to the
 * server console (so password-reset links can be followed locally); in
 * production an error is thrown, because silently dropping mail would hide
 * a misconfiguration.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const env = getServerEnv();
  const transport = getTransporter();

  if (!transport) {
    if (env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured (SMTP_HOST is empty); email cannot be sent.");
    }
    console.warn(
      `\n[mail] SMTP not configured, printing instead of sending\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`,
    );
    return;
  }

  await transport.sendMail({ from: env.SMTP_FROM, ...message });
}
