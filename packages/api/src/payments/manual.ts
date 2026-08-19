import prisma from '@nexus/database';
import { PaymentProvider, PaymentOptions, PaymentResult } from './index';

// Manual mobile-money collection: the customer pays the platform's Airtel Pay
// merchant code (or number) directly, then the platform owner confirms the
// payment against their mobile-money statement. No gateway KYC required.

async function getInstructions() {
  const [code, number, name] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'MOMO_MERCHANT_CODE' } }),
    prisma.setting.findUnique({ where: { key: 'MOMO_NUMBER' } }),
    prisma.setting.findUnique({ where: { key: 'MOMO_ACCOUNT_NAME' } }),
  ]);
  return {
    merchantCode: (code?.value as string) || '',
    number: (number?.value as string) || '',
    accountName: (name?.value as string) || '',
  };
}

export const manualProvider: () => PaymentProvider = () => ({
  name: 'Mobile Money (manual confirm)',

  async charge(amount: number, currency: string, options: PaymentOptions): Promise<PaymentResult> {
    const instructions = await getInstructions();
    if (!instructions.merchantCode && !instructions.number) {
      return { success: false, status: 'ERROR', message: 'Mobile Money collection details not configured (MOMO_MERCHANT_CODE / MOMO_NUMBER)' };
    }
    return {
      success: true,
      transactionId: options.reference,
      status: 'PENDING',
      message: 'Pay via mobile money, then the store will confirm',
      data: { ...instructions, amount, currency, reference: options.reference },
    };
  },

  async verify(): Promise<PaymentResult> {
    return { success: false, status: 'PENDING', message: 'Awaiting manual confirmation' };
  },

  async refund(): Promise<PaymentResult> {
    return { success: false, status: 'ERROR', message: 'Refunds must be processed manually from the mobile money wallet' };
  },
});