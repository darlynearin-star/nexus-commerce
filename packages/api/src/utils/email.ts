import prisma from '@nexus/database';
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function getResendConfig() {
  const [apiKey, fromEmail] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'RESEND_API_KEY' } }),
    prisma.setting.findUnique({ where: { key: 'RESEND_FROM_EMAIL' } }),
  ]);
  return { apiKey: (apiKey?.value as string) || '', fromEmail: (fromEmail?.value as string) || '' };
}

async function getGmailConfig() {
  const [user, appPassword, fromEmail] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'GMAIL_USER' } }),
    prisma.setting.findUnique({ where: { key: 'GMAIL_APP_PASSWORD' } }),
    prisma.setting.findUnique({ where: { key: 'GMAIL_FROM_EMAIL' } }),
  ]);
  return {
    user: (user?.value as string) || '',
    appPassword: (appPassword?.value as string) || '',
    fromEmail: (fromEmail?.value as string) || (user?.value as string) || '',
  };
}

async function getBrevoConfig() {
  const [apiKey, user, smtpKey, fromEmail, fromName] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'BREVO_API_KEY' } }),
    prisma.setting.findUnique({ where: { key: 'BREVO_SMTP_LOGIN' } }),
    prisma.setting.findUnique({ where: { key: 'BREVO_SMTP_KEY' } }),
    prisma.setting.findUnique({ where: { key: 'BREVO_FROM_EMAIL' } }),
    prisma.setting.findUnique({ where: { key: 'BREVO_FROM_NAME' } }),
  ]);
  return {
    apiKey: (apiKey?.value as string) || '',
    user: (user?.value as string) || '',
    smtpKey: (smtpKey?.value as string) || '',
    fromEmail: (fromEmail?.value as string) || '',
    fromName: (fromName?.value as string) || '',
  };
}

export async function isEmailConfigured(): Promise<boolean> {
  const [resend, gmail, brevo] = await Promise.all([getResendConfig(), getGmailConfig(), getBrevoConfig()]);
  return Boolean(
    (resend.apiKey && resend.fromEmail) ||
    (brevo.apiKey && brevo.fromEmail) ||
    (gmail.user && gmail.appPassword) ||
    (brevo.user && brevo.smtpKey)
  );
}

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<{ success: boolean; message: string }> {
  const [resend, gmail, brevo] = await Promise.all([getResendConfig(), getGmailConfig(), getBrevoConfig()]);

  if (resend.apiKey && resend.fromEmail) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: resend.fromEmail, to: [to], subject, text, html }),
      });
      if (res.ok) return { success: true, message: 'Email sent' };
      const body: any = await res.json().catch(() => ({}));
      return { success: false, message: `Resend error: ${body?.message || `HTTP ${res.status}`}` };
    } catch (error: any) {
      return { success: false, message: `Resend error: ${error.message}` };
    }
  }

  if (brevo.apiKey && brevo.fromEmail) {
    try {
      const sender = brevo.fromName ? { name: brevo.fromName, email: brevo.fromEmail } : { email: brevo.fromEmail };
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevo.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text, htmlContent: html }),
      });
      if (res.ok) return { success: true, message: 'Email sent via Brevo API' };
      const body: any = await res.json().catch(() => ({}));
      return { success: false, message: `Brevo error: ${body?.message || `HTTP ${res.status}`}` };
    } catch (error: any) {
      return { success: false, message: `Brevo error: ${error.message}` };
    }
  }

  if (gmail.user && gmail.appPassword) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: gmail.user, pass: gmail.appPassword },
      });
      await transporter.sendMail({ from: gmail.fromEmail, to, subject, text, html });
      return { success: true, message: 'Email sent via Gmail' };
    } catch (error: any) {
      return { success: false, message: `Gmail error: ${error.message}` };
    }
  }

  if (brevo.user && brevo.smtpKey) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: { user: brevo.user, pass: brevo.smtpKey },
      });
      const from = brevo.fromEmail ? (brevo.fromName ? `${brevo.fromName} <${brevo.fromEmail}>` : brevo.fromEmail) : brevo.user;
      await transporter.sendMail({ from, to, subject, text, html });
      return { success: true, message: 'Email sent via Brevo' };
    } catch (error: any) {
      return { success: false, message: `Brevo error: ${error.message}` };
    }
  }

  return { success: false, message: 'Email not configured (set RESEND, BREVO, or GMAIL keys)' };
}

export function magicLinkHtml(url: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="margin:0 0 8px;color:#111">Sign in to Lyn-nyx Stores</h2>
  <p style="color:#374151;font-size:14px;line-height:1.6">Use the link below to sign in. This link expires in 15 minutes.</p>
  <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#00D9A3;color:#070B09;text-decoration:none;font-weight:600;border-radius:8px">Sign in</a>
  <p style="color:#6b7280;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
</div>`;
}

export function verifyEmailHtml(url: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="margin:0 0 8px;color:#111">Verify your email</h2>
  <p style="color:#374151;font-size:14px;line-height:1.6">Welcome to Lyn-nyx Stores! Please confirm your email address to activate your account. This link expires in 24 hours.</p>
  <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#00D9A3;color:#070B09;text-decoration:none;font-weight:600;border-radius:8px">Verify email</a>
  <p style="color:#6b7280;font-size:12px">If you didn't create this account, you can safely ignore this email.</p>
</div>`;
}

export function resetPasswordHtml(url: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="margin:0 0 8px;color:#111">Reset your password</h2>
  <p style="color:#374151;font-size:14px;line-height:1.6">Use the link below to choose a new password. This link expires in 30 minutes and can only be used once.</p>
  <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#00D9A3;color:#070B09;text-decoration:none;font-weight:600;border-radius:8px">Reset password</a>
  <p style="color:#6b7280;font-size:12px">If you didn't request a password reset, you can safely ignore this email.</p>
</div>`;
}

export function subscriptionExpiredHtml(opts: { storeName: string; days: number; url: string }): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="margin:0 0 8px;color:#111">Your subscription has expired</h2>
  <p style="color:#374151;font-size:14px;line-height:1.6">Hi there, the subscription for <strong>${opts.storeName}</strong> has expired and is now in its grace period.</p>
  <p style="color:#374151;font-size:14px;line-height:1.6">Renew within <strong>${opts.days} day${opts.days === 1 ? '' : 's'}</strong> or your store will be suspended.</p>
  <a href="${opts.url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#00D9A3;color:#070B09;text-decoration:none;font-weight:600;border-radius:8px">Renew subscription</a>
  <p style="color:#6b7280;font-size:12px">If you've already renewed, you can ignore this email.</p>
</div>`;
}

export function subscriptionSuspendedHtml(opts: { storeName: string; url: string }): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="margin:0 0 8px;color:#111">Your store has been suspended</h2>
  <p style="color:#374151;font-size:14px;line-height:1.6">Your store <strong>${opts.storeName}</strong> has been suspended because your subscription expired and was not renewed within the grace period.</p>
  <p style="color:#374151;font-size:14px;line-height:1.6">Renew your subscription to reactivate your store immediately.</p>
  <a href="${opts.url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#00D9A3;color:#070B09;text-decoration:none;font-weight:600;border-radius:8px">Reactivate store</a>
  <p style="color:#6b7280;font-size:12px">If you believe this is a mistake, contact support.</p>
</div>`;
}

export function announcementEmailHtml(opts: { title: string; message: string }): string {
  const message = opts.message.replace(/\n/g, '<br />');
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em">Lyn-nyx Stores</p>
  <h2 style="margin:0 0 12px;color:#111">${opts.title}</h2>
  <p style="color:#374151;font-size:14px;line-height:1.6">${message}</p>
  <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:20px">You are receiving this because a Lyn-nyx Stores announcement was addressed to you.</p>
</div>`;
}
