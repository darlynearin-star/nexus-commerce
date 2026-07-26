export interface PaymentProvider {
  name: string;
  charge(amount: number, currency: string, options: PaymentOptions): Promise<PaymentResult>;
  verify(transactionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount?: number): Promise<PaymentResult>;
}

export interface PaymentOptions {
  email: string;
  phone?: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: string;
  message: string;
  data?: any;
}

export function getPaymentProvider(method: string): PaymentProvider | null {
  const providers: Record<string, () => PaymentProvider> = {};
  try {
    const { flutterwaveProvider } = require('./flutterwave');
    providers['flutterwave'] = flutterwaveProvider;
  } catch {}
  try {
    const { mtnMomoProvider } = require('./mtn-momo');
    providers['mtn_momo'] = mtnMomoProvider;
  } catch {}
  try {
    const { airtelMoneyProvider } = require('./airtel-money');
    providers['airtel_money'] = airtelMoneyProvider;
  } catch {}

  const key = method.toLowerCase().replace(/\s+/g, '_');
  return providers[key]?.() || null;
}
