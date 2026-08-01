import prisma from '@nexus/database';
import { PaymentProvider, PaymentOptions, PaymentResult } from './index';

async function getCredentials() {
  const apiKey = await prisma.setting.findUnique({ where: { key: 'AIRTEL_MONEY_API_KEY' } });
  const username = await prisma.setting.findUnique({ where: { key: 'AIRTEL_MONEY_USERNAME' } });
  return { apiKey: (apiKey?.value as string) || '', username: (username?.value as string) || '' };
}

const AIRTEL_BASE = 'https://openapi.airtel.africa';

export const airtelMoneyProvider: () => PaymentProvider = () => ({
  name: 'Airtel Money',

  async charge(amount: number, currency: string, options: PaymentOptions): Promise<PaymentResult> {
    const { apiKey, username } = await getCredentials();
    if (!apiKey || !username) return { success: false, status: 'ERROR', message: 'Airtel Money not configured' };
    try {
      const authRes = await fetch(`${AIRTEL_BASE}/auth/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: username, client_secret: apiKey, grant_type: 'client_credentials' }),
      });
      const auth: any = await authRes.json();
      const res = await fetch(`${AIRTEL_BASE}/merchant/v1/payments/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json', 'X-Reference-Id': options.reference },
        body: JSON.stringify({
          amount: amount.toString(),
          currency: currency || 'UGX',
          reference: options.reference,
          subscriber: { msisdn: options.phone?.replace(/\D/g, ''), country: 'UG' },
          description: 'Store purchase',
        }),
      });
      const data: any = await res.json();
      if (res.ok) {
        return { success: true, transactionId: data.transactionId, status: 'PENDING', message: 'Payment request sent', data };
      }
      return { success: false, status: 'FAILED', message: data.message || 'Airtel Money error' };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },

  async verify(transactionId: string): Promise<PaymentResult> {
    const { apiKey, username } = await getCredentials();
    if (!apiKey || !username) return { success: false, status: 'ERROR', message: 'Airtel Money not configured' };
    try {
      const authRes = await fetch(`${AIRTEL_BASE}/auth/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: username, client_secret: apiKey, grant_type: 'client_credentials' }),
      });
      const auth: any = await authRes.json();
      const res = await fetch(`${AIRTEL_BASE}/merchant/v1/payments/${transactionId}`, {
        headers: { Authorization: `Bearer ${auth.access_token}`, 'X-Reference-Id': transactionId },
      });
      if (res.ok) {
        const data: any = await res.json();
        return { success: true, transactionId, status: data.status === 'SUCCESS' ? 'PAID' : 'PENDING', message: `Status: ${data.status}`, data };
      }
      return { success: false, status: 'FAILED', message: `Verification failed: ${res.status}` };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },

  async refund(_transactionId: string): Promise<PaymentResult> {
    return { success: false, status: 'ERROR', message: 'Airtel Money refund not implemented' };
  },
});
