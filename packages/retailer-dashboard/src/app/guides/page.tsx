'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Package, ShoppingCart, CreditCard, Megaphone, Users, Settings, Store, Search, HelpCircle, ChevronRight } from 'lucide-react';

const guides = [
  {
    icon: <Store size={20} />,
    title: 'Getting started with your store',
    steps: [
      'Sign in and land on your Dashboard for an overview of sales, orders, and stock.',
      'Use the "View Store" button in the sidebar to open your live storefront.',
      'Keep an eye on the Subscription page. Your store must be active to be visible.',
    ],
    tip: 'Your dashboard is your control room. Explore each section in the left sidebar.',
  },
  {
    icon: <Package size={20} />,
    title: 'Adding & managing products',
    steps: [
      'Go to Product View to see everything you sell.',
      'Click Product Creation to add a new item. Upload a photo, set a UGX price, pick a category, and set stock.',
      'Edit any product later from Product View using the edit button.',
    ],
    tip: 'Add clear photos and descriptive names. They sell better and are easier for customers to find.',
  },
  {
    icon: <ShoppingCart size={20} />,
    title: 'Handling orders',
    steps: [
      'Open the Orders page to see new and past orders from customers.',
      'Review the items, customer details, and payment status for each order.',
      'Keep order status up to date so customers can track their purchases.',
    ],
    tip: 'Check the Orders page daily so nothing slips through.',
  },
  {
    icon: <Users size={20} />,
    title: 'Understanding your customers',
    steps: [
      'Visit the Customers page to see who is buying from you.',
      'Use customer details to reach out about restocks, offers, or order updates.',
      'Build repeat business by following up after delivery.',
    ],
    tip: 'Happy customers come back, and they bring friends.',
  },
  {
    icon: <Megaphone size={20} />,
    title: 'Marketing your store',
    steps: [
      'Open the Marketing page to set up promotions or discounts.',
      'Share your store link on WhatsApp, Facebook, and other channels.',
      'Point customers to your Categories and specific product pages.',
    ],
    tip: 'Your store link is in the sidebar, labelled "View Store". Share it everywhere.',
  },
  {
    icon: <CreditCard size={20} />,
    title: 'Subscriptions & payments',
    steps: [
      'Go to the Subscription page to see your trial status and plan.',
      'After your trial, pay the weekly fee (3,000 UGX) using MTN MoMo or Airtel Money.',
      'The payment opens a secure checkout. Confirm it on your phone to keep your store live.',
    ],
    tip: 'Set a reminder to renew, since your store goes hidden when the subscription lapses.',
  },
  {
    icon: <Settings size={20} />,
    title: 'Store settings & personalization',
    steps: [
      'Open Settings to update your store name, slug, contact info, and more.',
      'Adjust your theme and colors so your store matches your brand.',
      'Save changes and preview via "View Store".',
    ],
    tip: 'A clean, on-brand store builds trust with shoppers.',
  },
  {
    icon: <HelpCircle size={20} />,
    title: 'Getting help',
    steps: [
      'Run into an error? Note the message and the page you were on.',
      'Email support with details at lyn.nyx.store@gmail.com.',
      'Keep your store link handy so we can help faster.',
    ],
    tip: 'Mention what you were doing when the problem happened. It speeds up the fix.',
  },
];

function GuidesContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="skeleton" style={{ height: 32, width: '40%' }} />
      <div className="skeleton" style={{ height: 16, width: '25%' }} />
      <div className="skeleton" style={{ height: 220 }} />
    </div>
  );
  if (!user) { router.push('/login'); return null; }

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: 920 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Guides &amp; Tutorials</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          New to your retailer dashboard? Follow these guides to set up and grow your store step by step.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {guides.map((g, i) => (
          <div key={i} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '0.75rem', background: 'var(--bg-card)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--primary)', display: 'inline-flex' }}>{g.icon}</span> {g.title}
            </h2>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.25rem', color: 'var(--text)', lineHeight: 1.5 }}>
              {g.steps.map((s, j) => (
                <li key={j} style={{ fontSize: '0.875rem' }}>{s}</li>
              ))}
            </ol>
            <p style={{ marginTop: '0.875rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              💡 <strong style={{ color: 'var(--text)' }}>Tip:</strong> {g.tip}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          <Search size={18} style={{ color: 'var(--primary)' }} /> Still need help?
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Contact support and we&apos;ll walk you through anything.
        </p>
        <a href="mailto:lyn.nyx.store@gmail.com" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          Email Support <ChevronRight size={16} />
        </a>
      </div>
    </div>
  );
}

export default function GuidesPage() {
  return <GuidesContent />;
}
