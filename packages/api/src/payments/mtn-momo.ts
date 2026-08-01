import prisma from '@nexus/database';
import { PaymentProvider, PaymentOptions, PaymentResult } from './index';

async function getCredentials() {
  const [apiKey, apiUser, baseUrl, targetEnv] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'MTN_MOMO_API_KEY' } }),
    prisma.setting.findUnique({ where: { key: 'MTN_MOMO_API_USER' } }),
    prisma.setting.findUnique({ where: { key: 'MTN_MOMO_BASE_URL' } }),
    prisma.setting.findUnique({ where: { key: 'MTN_MOMO_TARGET_ENVIRONMENT' } }),
  ]);
  return {
    apiKey: (apiKey?.value as string) || '',
    apiUser: (apiUser?.value as string) || '',
    baseUrl: (baseUrl?.value as string) || 'https://sandbox.momodeveloper.mtn.com',
    targetEnv: (targetEnv?.value as string) || 'sandbox',
  };
}

export const mtnMomoProvider: () => PaymentProvider = () => ({
  name: 'MTN MoMo',

  async charge(amount: number, currency: string, options: PaymentOptions): Promise<PaymentResult> {
    const { apiKey, apiUser, baseUrl, targetEnv } = await getCredentials();
    if (!apiKey || !apiUser) return { success: false, status: 'ERROR', message: 'MTN MoMo not configured' };
    try {
      const authRes = await fetch(`${baseUrl}/collection/token/`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': apiKey, Authorization: `Basic ${Buffer.from(`${apiUser}:`).toString('base64')}` },
      });
      const auth: any = await authRes.json();
      const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'X-Reference-Id': options.reference,
          'X-Target-Environment': targetEnv,
          'Ocp-Apim-Subscription-Key': apiKey,
          Authorization: `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount.toString(),
          currency: currency || 'UGX',
          externalId: options.reference,
          payer: { partyIdType: 'MSISDN', partyId: options.phone?.replace(/\D/g, '') || '' },
          payerMessage: 'Store purchase',
          payeeNote: 'Thank you',
        }),
      });
      if (res.status === 202) {
        return { success: true, transactionId: options.reference, status: 'PENDING', message: 'Payment request sent to phone' };
      }
      return { success: false, status: 'FAILED', message: `MTN MoMo error: ${res.status}` };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },

  async verify(transactionId: string): Promise<PaymentResult> {
    const { apiKey, baseUrl, targetEnv } = await getCredentials();
    if (!apiKey) return { success: false, status: 'ERROR', message: 'MTN MoMo not configured' };
    try {
      const authRes = await fetch(`${baseUrl}/collection/token/`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': apiKey, Authorization: `Basic ${Buffer.from(':' + apiKey).toString('base64')}` },
      });
      const auth: any = await authRes.json();
      const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${transactionId}`, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey, Authorization: `Bearer ${auth.access_token}` },
      });
      if (res.status === 200) {
        const data: any = await res.json();
        return { success: true, transactionId, status: data.status === 'SUCCESSFUL' ? 'PAID' : 'PENDING', message: `Status: ${data.status}`, data };
      }
      return { success: false, status: 'FAILED', message: `Verification failed: ${res.status}` };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },

  async refund(_transactionId: string): Promise<PaymentResult> {
    return { success: false, status: 'ERROR', message: 'MTN MoMo refund not implemented' };
  },
});
