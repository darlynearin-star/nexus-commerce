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
  network?: string;
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
    const { pesapalProvider } = require('./pesapal');
    // Pesapal covers Uganda mobile money for both MTN and Airtel
    providers['mtn_momo'] = pesapalProvider;
    providers['airtel_money'] = pesapalProvider;
    providers['pesapal'] = pesapalProvider;
  } catch {}
  try {
    const { flutterwaveProvider } = require('./flutterwave');
    providers['flutterwave'] = flutterwaveProvider;
  } catch {}

  const key = method.toLowerCase().replace(/\s+/g, '_');
  return providers[key]?.() || null;
}
