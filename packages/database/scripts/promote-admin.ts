/**
 * One-off provisioning script (QA engagement, option A).
 *
 * Sets a known bcrypt passwordHash + SUPER_DEVELOPER role on a user so the
 * dev-dashboard positive flows can be exercised without Google OAuth.
 *
 * USAGE (from repo root):
 *   $env:DATABASE_URL = "<ProdConnectionString>"
 *   npm run db:promote-admin -w packages/database   # uses EMAIL + PASSWORD env
 *
 * Env vars:
 *   EMAIL      target account (default: darlynearin@gmail.com)
 *   PASSWORD   password to set   (default: Password123!)
 *
 * Idempotent: creates the user + developer row if missing; never touches
 * other users. Requires DATABASE_URL (or DATABASE_URL_FALLBACK) to be set.
 */
import prisma from '../src/index';
import bcrypt from 'bcryptjs';

async function main() {
  const email = (process.env.EMAIL || 'darlynearin@gmail.com').toLowerCase();
  const password = process.env.PASSWORD || 'Password123!';
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_FALLBACK) {
    console.error('ERROR: set DATABASE_URL (or DATABASE_URL_FALLBACK) first.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_DEVELOPER',
        emailVerified: true,
      },
    });
    console.log(`Created user ${email} (${user.id}).`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, emailVerified: true },
    });
    console.log(`Updated existing user ${email} (${user.id}).`);
  }

  const dev = await prisma.developer.findUnique({ where: { userId: user.id } });
  if (!dev) {
    await prisma.developer.create({ data: { userId: user.id } });
    console.log('Created developer profile row.');
  }

  const promoted = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPER_DEVELOPER' },
    select: { email: true, role: true, emailVerified: true, id: true },
  });

  console.log('Done:', JSON.stringify(promoted));
  console.log(`Now sign in at dev dashboard with ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));