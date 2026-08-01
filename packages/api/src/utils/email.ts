import prisma from '@nexus/database';

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

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<{ success: boolean; message: string }> {
  const { apiKey, fromEmail } = await getResendConfig();
  if (!apiKey) return { success: false, message: 'Resend not configured (RESEND_API_KEY missing)' };
  if (!fromEmail) return { success: false, message: 'Resend not configured (RESEND_FROM_EMAIL missing)' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromEmail, to: [to], subject, text, html }),
    });
    if (res.ok) return { success: true, message: 'Email sent' };
    const body: any = await res.json().catch(() => ({}));
    return { success: false, message: `Resend error: ${body?.message || `HTTP ${res.status}`}` };
  } catch (error: any) {
    return { success: false, message: `Resend error: ${error.message}` };
  }
}

export function magicLinkHtml(url: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="margin:0 0 8px;color:#111">Sign in to Lyn-nxy Stores</h2>
  <p style="color:#374151;font-size:14px;line-height:1.6">Use the link below to sign in. This link expires in 15 minutes.</p>
  <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#D4A843;color:#0A0A0A;text-decoration:none;font-weight:600;border-radius:8px">Sign in</a>
  <p style="color:#6b7280;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
</div>`;
}
