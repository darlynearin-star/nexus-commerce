const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const r = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('DB works:', JSON.stringify(r));
    const users = await prisma.user.count();
    console.log('User count:', users);
    const stores = await prisma.store.count();
    console.log('Store count:', stores);
    const retailers = await prisma.retailer.count();
    console.log('Retailer count:', retailers);
  } catch (e) {
    console.error('DB error:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
