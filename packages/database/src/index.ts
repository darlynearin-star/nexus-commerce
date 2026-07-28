import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
export { jijiCategories } from './jiji-categories';
export type { JijiCategory } from './jiji-categories';