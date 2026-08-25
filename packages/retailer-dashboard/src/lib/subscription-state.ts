/**
 * Pure subscription-lock decision, extracted so the fail-closed rule is
 * unit-testable without React.
 *
 * H5 rule: when the subscription status is UNKNOWN (fetch failed), the
 * dashboard must stay LOCKED — an API outage must never unlock paywalled UI.
 * Only a positively-identified active/trial subscription opens the gate.
 */
export function isSubscriptionLocked(sub: any, subError: boolean): boolean {
  if (subError) return true; // fail closed on unknown state
  if (!sub) return false; // no record at all (e.g. non-retailer passthrough)
  if (sub.status === 'SUSPENDED' || sub.status === 'CANCELLED') return true;
  const trialEnded = sub.status === 'TRIAL' && sub?.trialEnd && new Date(sub.trialEnd) < new Date();
  return !!trialEnded;
}
