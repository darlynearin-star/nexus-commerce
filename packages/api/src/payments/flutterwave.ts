import prisma from '@nexus/database';
import { PaymentProvider, PaymentOptions, PaymentResult } from './index';

async function getSecretKey(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: 'FLUTTERWAVE_SECRET_KEY' } });
  return (setting?.value as string) || process.env.FLUTTERWAVE_SECRET_KEY || '';
}

async function mobileMoneyCharge(secretKey: string, amount: number, currency: string, options: PaymentOptions, network: string): Promise<PaymentResult> {
  const res = await fetch('https://api.flutterwave.com/v3/charges?type=mobile_money_uganda', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: options.reference,
      amount,
      currency: currency || 'UGX',
      email: options.email,
      phone_number: options.phone?.replace(/\D/g, '') || '',
      network,
      fullname: options.metadata?.fullname || '',
      meta: options.metadata,
    }),
  });
  const data: any = await res.json();
  if (data.status === 'success') {
    return { success: true, transactionId: options.reference, status: 'PENDING', message: 'Payment request sent to phone', data: data.data };
  }
  return { success: false, status: 'FAILED', message: data.message || 'Flutterwave mobile money failed', data };
}

export const flutterwaveProvider: () => PaymentProvider = () => ({
  name: 'Flutterwave',

  async charge(amount: number, currency: string, options: PaymentOptions): Promise<PaymentResult> {
    const secretKey = await getSecretKey();
    if (!secretKey) return { success: false, status: 'ERROR', message: 'Flutterwave not configured' };
    try {
      if (options.network && options.phone) {
        return await mobileMoneyCharge(secretKey, amount, currency, options, options.network);
      }
      const res = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: options.reference,
          amount,
          currency,
          redirect_url: options.callbackUrl,
          customer: { email: options.email, phonenumber: options.phone },
          meta: options.metadata,
        }),
      });
      const data: any = await res.json();
      if (data.status === 'success') {
        return { success: true, transactionId: data.data.id?.toString(), status: 'PENDING', message: 'Payment initiated', data: data.data };
      }
      return { success: false, status: 'FAILED', message: data.message || 'Payment failed' };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },

  async verify(transactionId: string): Promise<PaymentResult> {
    const secretKey = await getSecretKey();
    if (!secretKey) return { success: false, status: 'ERROR', message: 'Flutterwave not configured' };
    try {
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const data: any = await res.json();
      if (data.status === 'success' && data.data?.status === 'successful') {
        return { success: true, transactionId, status: 'PAID', message: 'Payment verified', data: data.data };
      }
      const status = data.data?.status || 'FAILED';
      return { success: false, status: status === 'pending' ? 'PENDING' : status, message: data.message || 'Verification failed', data: data.data };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },

  async refund(transactionId: string, amount?: number): Promise<PaymentResult> {
    const secretKey = await getSecretKey();
    if (!secretKey) return { success: false, status: 'ERROR', message: 'Flutterwave not configured' };
    try {
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/refund`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(amount ? { amount } : {}),
      });
      const data: any = await res.json();
      if (data.status === 'success') {
        return { success: true, transactionId: data.data.id?.toString(), status: 'REFUNDED', message: 'Refund processed', data: data.data };
      }
      return { success: false, status: 'FAILED', message: data.message || 'Refund failed' };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },
});
