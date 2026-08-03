import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@nexus/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { logActivity } from '../utils/activity-log';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail, magicLinkHtml, isEmailConfigured } from '../utils/email';

export const authRouter = Router();

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

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const emailError = validateEmail(email);
    if (emailError) return res.status(400).json({ success: false, error: emailError });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = (req.body.role === 'RETAILER' || req.body.role === 'DEVELOPER') ? req.body.role : 'CUSTOMER';

    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, role, emailVerified: true },
    });

    if (role === 'RETAILER') {
      await prisma.retailer.create({ data: { userId: user.id, storeName: `${firstName}'s Store`, storeSlug: `${firstName.toLowerCase()}-${Date.now().toString(36)}` } });
    } else if (role === 'DEVELOPER') {
      await prisma.developer.create({ data: { userId: user.id } });
    }

    // All users get a customer profile (for purchasing)
    await prisma.customer.create({ data: { userId: user.id } });

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

    res.status(201).json({
      success: true,
      data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
});

// Login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is suspended' });
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
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    const session = await prisma.session.findUnique({ where: { token: refreshToken } });

    if (!session || !session.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const newAccessToken = signAccessToken(payload);

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// Logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.session.updateMany({
        where: { token: refreshToken, userId: req.user!.userId },
        data: { isActive: false },
      });
    }
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
// Google OAuth (Google login)
// ============================================================

// Kick off Google sign-in: redirect to Google's consent screen
authRouter.get('/google', async (req, res, next) => {
  try {
    const clientId = await getSetting('GOOGLE_CLIENT_ID');
    if (!clientId) return res.status(503).json({ success: false, error: 'Google login is not configured yet' });

    const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const state = crypto.randomBytes(16).toString('hex');
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

    logActivity({ userId: user.id, action: 'user:google_login', resource: 'auth', req: req as any });

    res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  } catch (error) { next(error); }
});