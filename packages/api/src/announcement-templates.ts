export interface AnnouncementTemplate {
  id: string;
  category: 'maintenance' | 'incident' | 'subscription' | 'payments' | 'platform' | 'security' | 'operations';
  type: 'INFO' | 'WARNING' | 'IMPORTANT';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  audience: string;
  tokens: string[];
}

// Common announcements for this platform, matched to real situations in the
// codebase: subscription enforcement (grace/suspension), manual Airtel Pay
// collection, maintenance deploys, incident comms, feature releases, security.
// Placeholders like {date} are substituted by the person publishing the notice.
export const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: 'maintenance-scheduled',
    category: 'maintenance',
    type: 'INFO',
    priority: 'HIGH',
    title: 'Scheduled maintenance on {date}',
    message:
      'Lyn-nyx Stores will be performing scheduled maintenance on {date} from {startTime} to {endTime}.\n\nDuring this window, the storefront and dashboards may be briefly unavailable while we deploy updates and apply database migrations.\n\nYour stores and orders are safe. Please plan accordingly, and contact {contactEmail} if you have any questions.',
    audience: 'Banner + all retailers',
    tokens: ['date', 'startTime', 'endTime', 'contactEmail'],
  },
  {
    id: 'maintenance-completed',
    category: 'maintenance',
    type: 'INFO',
    priority: 'NORMAL',
    title: 'Maintenance completed',
    message:
      'The scheduled maintenance has been completed. All services are back online and running normally.\n\nIf you experience any issues, please reach out to {contactEmail}.',
    audience: 'Banner only',
    tokens: ['contactEmail'],
  },
  {
    id: 'incident-degraded',
    category: 'incident',
    type: 'WARNING',
    priority: 'HIGH',
    title: 'Service disruption — we are on it',
    message:
      'We are currently investigating an issue that may cause slow loading or errors on the storefront and dashboards.\n\nNo action is needed from you. We will update this announcement as soon as we have more information.',
    audience: 'Banner + all retailers',
    tokens: ['contactEmail'],
  },
  {
    id: 'incident-resolved',
    category: 'incident',
    type: 'INFO',
    priority: 'NORMAL',
    title: 'Service restored',
    message:
      'The issue affecting the platform has been resolved. Everything is back to normal.\n\nIf you noticed anything unusual with your store or orders during the outage, please contact {contactEmail}.',
    audience: 'Banner + all retailers',
    tokens: ['contactEmail'],
  },
  {
    id: 'subscription-price-change',
    category: 'subscription',
    type: 'WARNING',
    priority: 'HIGH',
    title: 'Subscription price update from {date}',
    message:
      'From {date}, the weekly subscription price will change from {oldAmount} to {newAmount}.\n\nYour current plan continues at the existing price until {effectiveDate}. After that, the new price applies automatically each billing cycle.\n\nIf you have any questions, contact {contactEmail}.',
    audience: 'Email to all retailers',
    tokens: ['date', 'oldAmount', 'newAmount', 'effectiveDate', 'contactEmail'],
  },
  {
    id: 'subscription-trial-ending',
    category: 'subscription',
    type: 'WARNING',
    priority: 'HIGH',
    title: 'Your free trial ends on {date}',
    message:
      'Your 14-day free trial ends on {date}.\n\nTo keep your store live, subscribe before the trial ends:\n1. Open the Subscription page in your retailer dashboard.\n2. Choose a payment method and complete the payment.\n\nIf you do not subscribe, your store will be suspended on {date}.',
    audience: 'Email to retailers on trial',
    tokens: ['date', 'link'],
  },
  {
    id: 'subscription-grace-warning',
    category: 'subscription',
    type: 'WARNING',
    priority: 'HIGH',
    title: 'Action required: renew your subscription',
    message:
      'Your subscription has expired. You are currently in the grace period and your store remains live for now.\n\nRenew immediately to avoid suspension:\n{link}\n\nIf your subscription is not renewed by {date}, your store will be suspended until you renew.',
    audience: 'Email to lapsed retailers',
    tokens: ['date', 'link'],
  },
  {
    id: 'subscription-suspended',
    category: 'subscription',
    type: 'IMPORTANT',
    priority: 'CRITICAL',
    title: 'Your store has been suspended',
    message:
      'Your store has been suspended because your subscription expired and was not renewed within the grace period.\n\nTo reactivate your store immediately, renew your subscription:\n{link}\n\nIf you believe this is a mistake, contact {contactEmail}.',
    audience: 'Email to suspended retailers',
    tokens: ['link', 'contactEmail'],
  },
  {
    id: 'subscription-renewed',
    category: 'subscription',
    type: 'INFO',
    priority: 'NORMAL',
    title: 'Welcome back — your store is live',
    message:
      'Your subscription payment has been confirmed and your store is now live again.\n\nThank you for keeping {storeName} running on Lyn-nyx Stores.',
    audience: 'Email to renewed retailers',
    tokens: ['storeName'],
  },
  {
    id: 'payments-manual-howto',
    category: 'payments',
    type: 'INFO',
    priority: 'HIGH',
    title: 'Pay your subscription via Airtel Pay',
    message:
      'You can now pay for your subscription directly via mobile money.\n\n1. Open Airtel Money and dial *185*10*10# or use "Pay Bill / Merchant".\n2. Enter merchant code {merchantCode}.\n3. Enter the exact amount shown on your Subscription page.\n4. Enter your Airtel number {number} as your mobile number.\n5. Confirm and send.\n\nThen open the Subscription page, enter your Airtel Money transaction reference and tap "I have paid". Our team verifies and confirms it, usually within a few hours.',
    audience: 'Banner + email to retailers',
    tokens: ['merchantCode', 'number'],
  },
  {
    id: 'payments-confirmation-delay',
    category: 'payments',
    type: 'INFO',
    priority: 'NORMAL',
    title: 'Payment confirmations may take longer than usual',
    message:
      'Manual payment confirmations are currently taking longer than usual due to high volumes.\n\nYour store will not be affected — you remain active while your payment is being verified. We are working through the queue as fast as possible.',
    audience: 'Banner only',
    tokens: [],
  },
  {
    id: 'platform-feature-release',
    category: 'platform',
    type: 'INFO',
    priority: 'NORMAL',
    title: 'New: {feature} is here',
    message:
      'We have just released {feature}.\n\nWhat it does: {summary}\n\nTo use it: {howTo}\n\nAs always, reply to {contactEmail} with feedback or requests.',
    audience: 'Banner + email to all',
    tokens: ['feature', 'summary', 'howTo', 'contactEmail'],
  },
  {
    id: 'platform-new-payment-method',
    category: 'platform',
    type: 'INFO',
    priority: 'NORMAL',
    title: 'New payment method available',
    message:
      'We now support {paymentMethod} for orders and subscriptions.\n\nThis gives your customers more ways to pay. No action is needed on your end.',
    audience: 'Banner + email to retailers',
    tokens: ['paymentMethod'],
  },
  {
    id: 'security-password-reset',
    category: 'security',
    type: 'WARNING',
    priority: 'HIGH',
    title: 'Please update your password',
    message:
      'As part of a routine security review, we are asking all accounts to update their passwords.\n\nOpen your dashboard, go to Account Settings, and set a new password. Choose a strong password you do not use anywhere else.\n\nNever share your password or login links with anyone.',
    audience: 'Email to all users',
    tokens: ['link'],
  },
  {
    id: 'security-suspicious-activity',
    category: 'security',
    type: 'IMPORTANT',
    priority: 'CRITICAL',
    title: 'Security alert on your account',
    message:
      'We detected a login attempt on your account from a device or location we did not recognise.\n\nIf this was you, no action is needed. If it was not you, reset your password immediately and contact {contactEmail}.',
    audience: 'Email to affected users',
    tokens: ['contactEmail'],
  },
  {
    id: 'operations-holiday',
    category: 'operations',
    type: 'INFO',
    priority: 'LOW',
    title: 'Holiday notice',
    message:
      'Our support and manual payment confirmation team will be offline on {date} for a public holiday.\n\nPayments received that day will be confirmed on the next working day. Your store remains live as usual.',
    audience: 'Banner + email to retailers',
    tokens: ['date'],
  },
  {
    id: 'operations-new-retailer',
    category: 'operations',
    type: 'INFO',
    priority: 'NORMAL',
    title: 'Welcome to Lyn-nyx Stores!',
    message:
      'Your store has been created and you are now on a free 14-day trial.\n\nNext steps:\n1. Set up your store name and description in the dashboard.\n2. Add your products and set up your store theme.\n3. Share your store link with customers: {link}\n\nWhen the trial ends, subscribe to keep your store live. Contact {contactEmail} if you need any help.',
    audience: 'Email to new retailers',
    tokens: ['link', 'contactEmail'],
  },
];