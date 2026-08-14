import Link from 'next/link';

const guides = [
  {
    icon: '👤',
    title: 'Creating an account',
    steps: [
      'Click "Sign In" in the top-right corner, then "Create Account".',
      'Fill in your name, email, and a strong password (or use "Continue with Google").',
      'Verify your email using the magic link we send you, then you\'re in.',
    ],
    tip: 'Your account works across the whole platform: storefront, retailer, and developer apps.',
  },
  {
    icon: '🛍️',
    title: 'Browsing & finding products',
    steps: [
      'Use the search bar in the header to find anything by name.',
      'Browse the Categories page to explore by type.',
      'Open a product card to see photos, price, and description.',
    ],
    tip: 'Use the heart icon to save products to your wishlist for later.',
  },
  {
    icon: '🛒',
    title: 'Placing your first order',
    steps: [
      'Add items to your cart with the "Add to Cart" button.',
      'Open the cart, review quantities, and tap "Checkout".',
      'Enter your delivery details and choose your payment method.',
    ],
    tip: 'You can track order status from your account page after ordering.',
  },
  {
    icon: '💳',
    title: 'Paying with MTN MoMo or Airtel Money',
    steps: [
      'At checkout, pick MTN Mobile Money or Airtel Money.',
      'You\'ll be asked to approve the payment from your phone.',
      'Confirm on your phone, and the order goes through automatically.',
    ],
    tip: 'Double-check the phone number you enter. It must be the one registered on the wallet.',
  },
  {
    icon: '🏪',
    title: 'Creating your own store',
    steps: [
      'Sign in, then click "Create Store" from the menu.',
      'Pick a template (Elegance, Minimal, Bold, or Nature) and set your colors.',
      'Add your products with photos and UGX prices, then share your link.',
    ],
    tip: 'You get a free trial to start. After that, a small weekly subscription keeps it live.',
  },
  {
    icon: '📚',
    title: 'Understanding subscriptions',
    steps: [
      'Stores are free during the trial period.',
      'After trial, you pay a weekly fee (3,000 UGX) via MTN MoMo or Airtel Money.',
      'Pay from the Subscription page in your retailer dashboard to stay active.',
    ],
    tip: 'Your store stays visible only while the subscription is active.',
  },
];

export default function GuidesPage() {
  return (
    <div className="container" style={{ padding: 'clamp(2rem, 5vw, 3.5rem) 1rem', maxWidth: 920 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>
        Guides &amp; Tutorials
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
        New to Lyn-nyx Stores? These step-by-step guides walk you through everything, from your first
        account to running your own store.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {guides.map((g, i) => (
          <div key={i} className="card" style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{g.icon}</span> {g.title}
            </h2>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingLeft: '1.25rem', color: 'var(--text)', lineHeight: 1.5 }}>
              {g.steps.map((s, j) => (
                <li key={j} style={{ fontSize: '0.9375rem' }}>{s}</li>
              ))}
            </ol>
            <p style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'var(--glow)', border: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              💡 <strong style={{ color: 'var(--text)' }}>Tip:</strong> {g.tip}
            </p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Still stuck?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
          Reach out to our support team and we&apos;ll help you out.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="mailto:darlenzai01@gmail.com" className="btn btn-primary">Email Support</a>
          <Link href="/register" className="btn btn-secondary">Get Started</Link>
        </div>
      </div>
    </div>
  );
}
