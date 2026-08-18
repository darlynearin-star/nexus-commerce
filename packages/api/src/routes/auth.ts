import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '@nexus/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken, JWT_SECRET } from '../utils/jwt';
import { logActivity } from '../utils/activity-log';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail, magicLinkHtml, verifyEmailHtml, resetPasswordHtml, isEmailConfigured } from '../utils/email';
import { validatePassword } from '../utils/password-policy';
import { isAccountLocked, recordFailure, recordSuccess } from '../utils/login-attempts';

export const authRouter = Router();

const COOKIE_NAME = 'nexus_refresh';
const isProd = process.env.NODE_ENV === 'production';

// httpOnly refresh cookie: not readable by JS, so XSS cannot exfiltrate it.
// SameSite=Lax blocks cross-site sends; Secure is applied in production.
function setRefreshCookie(res: any, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: any) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com',
  'throwaway.email','yopmail.com','sharklasers.com','trashmail.com',
  'temp-mail.org','fakeinbox.com','maildrop.cc','getnada.com',
]);

function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email format';
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'Invalid email domain';
  if (domain.split('.').length < 2) return 'Email domain must include a TLD (e.g. .com, .ug)';
  if (DISPOSABLE_DOMAINS.has(domain)) return 'Disposable email addresses are not allowed';
  return null;
}

// Register
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ success: false, error: passwordError });

    const emailError = validateEmail(email);
    if (emailError) return res.status(400).json({ success: false, error: emailError });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = 'CUSTOMER';

    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, role, emailVerified: false },
    });

    // All users get a customer profile (for purchasing)
    await prisma.customer.create({ data: { userId: user.id } });

    // Send verification email (account not active until verified)
    const emailConfigured = await isEmailConfigured();
    if (emailConfigured) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.magicLinkToken.create({
        data: { token, email, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      const frontendUrl = (await getSetting('AUTH_REDIRECT_URL')) || 'https://nexus-storefront-dusky.vercel.app';
      const link = `${frontendUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      await sendEmail({
        to: email,
        subject: 'Verify your email',
        text: `Welcome to Lyn-nyx Stores! Verify your email to activate your account: ${link}`,
        html: verifyEmailHtml(link),
      });
      return res.status(201).json({
        success: true,
        message: 'Account created. Check your inbox to verify your email before signing in.',
        data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }, requiresEmailVerification: true },
      });
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
});

// Verify email (from the verification link sent at registration)
authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) return res.status(400).json({ success: false, error: 'Token and email are required' });

    const record = await prisma.magicLinkToken.findUnique({ where: { token } });
    if (!record || record.email !== email || record.usedAt || record.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Invalid or expired verification link' });
    }

    await prisma.magicLinkToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.emailVerified) return res.json({ success: true, message: 'Email already verified. You can sign in.' });

    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    logActivity({ userId: user.id, action: 'user:email_verified', resource: 'auth', req: req as any });

    res.json({ success: true, message: 'Email verified. You can now sign in.' });
  } catch (error) { next(error); }
});

// Resend the verification email
authRouter.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ success: false, error: 'No account found with that email' });
    if (user.emailVerified) return res.status(400).json({ success: false, error: 'Email is already verified' });

    const emailConfigured = await isEmailConfigured();
    if (!emailConfigured) return res.status(503).json({ success: false, error: 'Email login is not configured yet' });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.magicLinkToken.create({
      data: { token, email, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    const frontendUrl = (await getSetting('AUTH_REDIRECT_URL')) || 'https://nexus-storefront-dusky.vercel.app';
    const link = `${frontendUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    await sendEmail({
      to: email,
      subject: 'Verify your email',
      text: `Welcome to Lyn-nyx Stores! Verify your email to activate your account: ${link}`,
      html: verifyEmailHtml(link),
    });

    res.json({ success: true, message: 'Verification email sent. Check your inbox.' });
  } catch (error) { next(error); }
});

// Login
authRouter.post('/login', async (req, res, next) => {  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Account-level lockout (progressive backoff after repeated failures).
    const lock = isAccountLocked(email);
    if (lock.locked) {
      return res.status(429).json({ success: false, error: `Too many failed attempts. Try again in ${Math.ceil((lock.retryAfterMs || 0) / 1000)}s.` });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      recordFailure(email);
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    recordSuccess(email);

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is suspended' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ success: false, error: 'Please verify your email before signing in. Check your inbox for the verification link.', code: 'EMAIL_NOT_VERIFIED' });
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    setRefreshCookie(res, refreshToken);

    logActivity({ userId: user.id, action: 'user:login', resource: 'auth', req: req as any });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken: bodyRefreshToken } = req.body;
    const refreshToken = bodyRefreshToken || (req.cookies as any)?.[COOKIE_NAME];
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    const session = await prisma.session.findUnique({ where: { token: refreshToken } });

    if (!session || !session.isActive) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const newAccessToken = signAccessToken(payload);
    setRefreshCookie(res, refreshToken);

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// Logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { refreshToken } = req.body;
    const cookieToken = (req.cookies as any)?.[COOKIE_NAME];
    const tokenToInvalidate = refreshToken || cookieToken;
    if (tokenToInvalidate) {
      await prisma.session.updateMany({
        where: { token: tokenToInvalidate, userId: req.user!.userId },
        data: { isActive: false },
      });
    }
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Me
authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { customer: true, retailer: { include: { subscription: true } }, developer: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { ...user, passwordHash: undefined } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// Magic link (passwordless email login via Resend)
// ============================================================

async function getSetting(key: string): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return (s?.value as string) || '';
}

// Request a magic link
authRouter.post('/magic-link', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const emailError = validateEmail(email);
    if (emailError) return res.status(400).json({ success: false, error: emailError });

    const emailConfigured = await isEmailConfigured();
    if (!emailConfigured) {
      return res.status(503).json({ success: false, error: 'Email login is not configured yet' });
    }

    // Always create a token so the flow works for both existing and new users.
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.magicLinkToken.create({
      data: { token, email, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });

    const frontendUrl = (await getSetting('AUTH_REDIRECT_URL')) || 'https://nexus-storefront-dusky.vercel.app';
    const link = `${frontendUrl}/auth/magic-link?token=${token}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: 'Your sign-in link',
      text: `Sign in to Lyn-nyx Stores: ${link}`,
      html: magicLinkHtml(link),
    });

    res.json({ success: true, message: 'If this email is valid, a sign-in link has been sent.' });
  } catch (error) { next(error); }
});

// Redeem a magic link (auto-creates account if needed)
authRouter.post('/magic-link/verify', async (req, res, next) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) return res.status(400).json({ success: false, error: 'Token and email are required' });

    const record = await prisma.magicLinkToken.findUnique({ where: { token } });
    if (!record || record.email !== email || record.usedAt || record.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Invalid or expired link' });
    }

    await prisma.magicLinkToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const firstName = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ') || 'New';
      user = await prisma.user.create({
        data: { email, firstName, lastName: '', passwordHash: null, role: 'CUSTOMER', emailVerified: true },
      });
      await prisma.customer.create({ data: { userId: user.id } });
    } else if (!user.emailVerified) {
      user = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    }

    if (!user.isActive) return res.status(403).json({ success: false, error: 'Account is suspended' });

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    setRefreshCookie(res, refreshToken);

    logActivity({ userId: user.id, action: 'user:magic_link_login', resource: 'auth', req: req as any });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) { next(error); }
});

// ============================================================
// Password reset (self-service)
// ============================================================

// Request a reset: creates a single-use token and emails a link. Responds
// generically so account existence cannot be enumerated.
authRouter.post('/password-reset/request', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const emailConfigured = await isEmailConfigured();
    if (!emailConfigured) {
      return res.status(503).json({ success: false, error: 'Password reset is not configured yet' });
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.passwordResetToken.create({
        data: { token, email: user.email, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      });

      const frontendUrl = (await getSetting('AUTH_REDIRECT_URL')) || 'https://nexus-storefront-dusky.vercel.app';
      const link = `${frontendUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        text: `Reset your Lyn-nyx Stores password: ${link}`,
        html: resetPasswordHtml(link),
      });
    }

    res.json({ success: true, message: 'If this email is registered, a password reset link has been sent.' });
  } catch (error) { next(error); }
});

// Confirm a reset: validates the token, applies the new password, invalidates
// all existing sessions so old tokens are unusable.
authRouter.post('/password-reset/confirm', async (req, res, next) => {
  try {
    const { token, email, newPassword } = req.body || {};
    if (!token || !email) return res.status(400).json({ success: false, error: 'Token and email are required' });

    const passwordError = validatePassword(newPassword || '');
    if (passwordError) return res.status(400).json({ success: false, error: passwordError });

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.email !== email || record.usedAt || record.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Invalid or expired reset link' });
    }

    const user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid or expired reset link' });
    if (!user.isActive) return res.status(403).json({ success: false, error: 'Account is suspended' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    logActivity({ userId: user.id, action: 'user:password_reset', resource: 'auth', req: req as any });

    res.json({ success: true, message: 'Password updated. You can now sign in with your new password.' });
  } catch (error) { next(error); }
});

// ============================================================
// Google OAuth (Google login)
// ============================================================

// Stateless, signed OAuth state so the callback cannot be forged or replayed
// (login CSRF / session-fixation defense). Expires in 10 minutes.
function issueOAuthState(): string {
  return jwt.sign({ purpose: 'google-oauth', nonce: crypto.randomBytes(16).toString('hex') }, JWT_SECRET, { expiresIn: '10m' });
}

function verifyOAuthState(state: unknown): boolean {
  if (typeof state !== 'string' || !state) return false;
  try {
    const decoded = jwt.verify(state, JWT_SECRET) as { purpose?: string };
    return decoded.purpose === 'google-oauth';
  } catch {
    return false;
  }
}

// Kick off Google sign-in: redirect to Google's consent screen
authRouter.get('/google', async (req, res, next) => {
  try {
    const clientId = await getSetting('GOOGLE_CLIENT_ID');
    if (!clientId) return res.status(503).json({ success: false, error: 'Google login is not configured yet' });

    const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const state = issueOAuthState();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('state', state);
    res.redirect(url.toString());
  } catch (error) { next(error); }
});

// Google redirects here after user consents
authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state;
    if (!verifyOAuthState(state)) return res.redirect(`/?error=google_state_invalid`);
    if (!code) return res.redirect(`/?error=google_denied`);

    const clientId = await getSetting('GOOGLE_CLIENT_ID');
    const clientSecret = await getSetting('GOOGLE_CLIENT_SECRET');
    const frontendUrl = (await getSetting('AUTH_REDIRECT_URL')) || 'https://nexus-storefront-dusky.vercel.app';
    if (!clientId || !clientSecret) return res.status(503).json({ success: false, error: 'Google login is not configured yet' });

    const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return res.redirect(`${frontendUrl}?error=google_token_failed`);
    const tokenData: any = await tokenRes.json();

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userInfoRes.ok) return res.redirect(`${frontendUrl}?error=google_userinfo_failed`);
    const profile: any = await userInfoRes.json();

    const email = profile.email?.toLowerCase();
    if (!email) return res.redirect(`${frontendUrl}?error=google_no_email`);

    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          googleId: profile.sub,
          firstName: profile.given_name || profile.name?.split(' ')[0] || 'Google',
          lastName: profile.family_name || '',
          passwordHash: null,
          role: 'CUSTOMER',
          emailVerified: true,
          avatar: profile.picture || null,
        },
      });
      await prisma.customer.create({ data: { userId: user.id } });
    } else {
      const updates: any = { emailVerified: true };
      if (!user.googleId) updates.googleId = profile.sub;
      if (!user.avatar && profile.picture) updates.avatar = profile.picture;
      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }

    if (!user.isActive) return res.redirect(`${frontendUrl}?error=account_suspended`);

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    setRefreshCookie(res, refreshToken);

    logActivity({ userId: user.id, action: 'user:google_login', resource: 'auth', req: req as any });

    res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  } catch (error) { next(error); }
});