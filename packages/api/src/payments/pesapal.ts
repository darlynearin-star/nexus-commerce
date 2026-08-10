import prisma from '@nexus/database';
import { PaymentProvider, PaymentOptions, PaymentResult } from './index';

const PROD_BASE = 'https://pay.pesapal.com';
const TEST_BASE = 'https://cybqa.pesapal.com';

async function getSetting(key: string): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return (setting?.value as string) || process.env[key] || '';
}

async function getConsumerKey(): Promise<string> {
  return getSetting('PESAPAL_CONSUMER_KEY');
}

async function getConsumerSecret(): Promise<string> {
  return getSetting('PESAPAL_CONSUMER_SECRET');
}

async function baseUrl(): Promise<string> {
  const stored = await getSetting('PESAPAL_BASE_URL');
  return stored ? stored.replace(/\/+$/, '') : PROD_BASE;
}

async function requestToken(): Promise<string | null> {
  const consumerKey = await getConsumerKey();
  const consumerSecret = await getConsumerSecret();
  if (!consumerKey || !consumerSecret) return null;
  try {
    const res = await fetch(`${await baseUrl()}/v3/api/Auth/RequestToken`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
    });
    const data: any = await res.json();
    if (!res.ok) {
      console.error('Pesapal auth error:', data);
      return null;
    }
    return data.token || data.access_token || null;
  } catch (error: any) {
    console.error('Pesapal auth failed:', error.message);
    return null;
  }
}

async function registerIPNURL(token: string, callbackUrl?: string): Promise<string | null> {
  const url = callbackUrl || process.env.PESAPAL_IPN_URL || '';
  if (!url) return null;
  try {
    const res = await fetch(`${await baseUrl()}/v3/api/URLSetup/RegisterIPNURL`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, ipn_notification_type: 'GET' }),
    });
    const data: any = await res.json();
    if (!res.ok || !data.ipn_id) {
      console.error('Pesapal RegisterIPNURL error:', data);
      return null;
    }
    return data.ipn_id;
  } catch (error: any) {
    console.error('Pesapal RegisterIPNURL failed:', error.message);
    return null;
  }
}

function parseBilling(options: PaymentOptions): Record<string, string> {
  const meta = options.metadata || {};
  return {
    email_address: options.email,
    phone_number: options.phone?.replace(/\D/g, '') || '',
    country_code: 'UG',
    first_name: meta.firstName || 'Nexus',
    last_name: meta.lastName || 'Customer',
  };
}

export const pesapalProvider: () => PaymentProvider = () => ({
  name: 'Pesapal',

  async charge(amount: number, currency: string, options: PaymentOptions): Promise<PaymentResult> {
    const token = await requestToken();
    if (!token) return { success: false, status: 'ERROR', message: 'Pesapal not configured' };
    try {
      const ipnUrl = options.metadata?.ipnUrl || options.callbackUrl;
      const notificationId = await registerIPNURL(token, ipnUrl);
      const res = await fetch(`${await baseUrl()}/v3/api/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: options.reference,
          currency: currency || 'UGX',
          amount,
          description: options.metadata?.description || 'Lyn-nyx Stores payment',
          callback_url: options.callbackUrl,
          notification_id: notificationId || undefined,
          branch: 'Nexus',
          source: 'NEXUS',
          billing_address: parseBilling(options),
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        return { success: false, status: 'FAILED', message: data.error?.message || data.message || 'Pesapal order failed', data };
      }
      return {
        success: true,
        transactionId: data.order_tracking_id || data.merchant_reference,
        status: 'PENDING',
        message: 'Payment initiated',
        data,
      };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },

  async verify(transactionId: string): Promise<PaymentResult> {
    const token = await requestToken();
    if (!token) return { success: false, status: 'ERROR', message: 'Pesapal not configured' };
    try {
      const res = await fetch(`${await baseUrl()}/v3/api/Transactions/GetTransactionStatus?order_tracking_id=${encodeURIComponent(transactionId)}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const data: any = await res.json();
      if (!res.ok) {
        return { success: false, status: 'FAILED', message: data.error?.message || data.message || 'Verification failed', data };
      }
      const status = (data.payment_status_description || '').toUpperCase();
      if (status === 'COMPLETED') {
        return { success: true, transactionId: data.order_tracking_id, status: 'PAID', message: 'Payment verified', data };
      }
      const mapped = status === 'PENDING' ? 'PENDING' : status === 'FAILED' ? 'FAILED' : status === 'CANCELLED' ? 'CANCELLED' : 'PENDING';
      return { success: false, transactionId: data.order_tracking_id, status: mapped, message: `Payment ${status || 'pending'}`, data };
    } catch (error: any) {
      return { success: false, status: 'ERROR', message: error.message };
    }
  },

  async refund(transactionId: string): Promise<PaymentResult> {
    return { success: false, status: 'ERROR', message: 'Pesapal refunds must be processed in the Pesapal merchant dashboard' };
  },
});
