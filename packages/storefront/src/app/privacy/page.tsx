import Link from 'next/link';
import { Mail } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Lyn-nyx Stores',
  description: 'How Lyn-nyx Stores collects, uses, and protects your personal data.',
};

const sections = [
  {
    title: 'Who we are',
    body: 'Lyn-nyx Stores is an online marketplace where retailers in Uganda create their own storefronts and customers buy fashion, accessories, and body ornaments. The platform is operated by Mr. Dev (lyn.nyx.store@gmail.com).',
  },
  {
    title: 'What we collect',
    body: 'When you create an account we collect your first name, last name, email address, and a securely hashed password. If you sign in with Google, we receive the profile information Google shares with us. Retailers also provide a store name, a store URL (slug), template choices, brand colors, an optional logo, product listings, prices, and stock levels. When you place an order we collect your phone number, delivery address, and any delivery notes you provide. We do not store card numbers.',
  },
  {
    title: 'How we use your information',
    body: 'We use your information to operate the platform: process orders, coordinate delivery between customers and sellers, manage subscriptions and billing for retailers, send order confirmations and account notifications, provide support, prevent abuse, and improve the service. Your email may be used for important service messages, such as verification links and subscription status.',
  },
  {
    title: 'Payments',
    body: 'Orders are paid on delivery, on terms agreed between the customer and the seller. Retailer subscriptions are billed weekly. Payment instructions are handled by providers such as MTN Mobile Money and Airtel Money, and payment details are processed by those providers according to their own privacy practices.',
  },
  {
    title: 'Who we share data with',
    body: 'We do not sell your personal data. Order details, including your name, phone number, and address, are shared with the seller you order from so they can fulfil delivery. We use third-party infrastructure providers (hosting and email services) that process data on our behalf under their own privacy commitments. Google sign-in shares only the profile information you authorize.',
  },
  {
    title: 'How we protect your data',
    body: 'Passwords are stored as salted hashes, never in plain text. Access is protected with expiring tokens, and accounts are secured against unauthorized access. While no online service can guarantee absolute security, we keep personal data within the minimum scope needed to run the platform.',
  },
  {
    title: 'How long we keep data',
    body: 'We keep your account and order records for as long as your account is active, and for a reasonable period afterwards to meet legal and accounting requirements. You can ask us to delete your data at any time.',
  },
  {
    title: 'Your rights',
    body: 'You can request a copy of the personal data we hold about you, ask us to correct inaccurate information, or ask us to delete your account and data. To exercise any of these rights, email Mr. Dev at lyn.nyx.store@gmail.com and we will respond within a reasonable time.',
  },
  {
    title: 'Cookies and local storage',
    body: 'The platform uses browser local storage to keep you signed in, remember your active store, and persist preferences like the colour theme. These are simple text values stored on your device; you can clear them at any time through your browser settings.',
  },
  {
    title: 'Children',
    body: 'Lyn-nyx Stores is not directed at children under 13, and we do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us and we will remove it.',
  },
  {
    title: 'Changes to this policy',
    body: 'We may update this policy from time to time. When we do, the revised version will be posted here, and significant changes will be announced through the platform.',
  },
  {
    title: 'Contact',
    body: 'Questions about this policy or your data can be sent to lyn.nyx.store@gmail.com. We are happy to clarify anything before you sign up.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="container" style={{ maxWidth: 720, padding: 'clamp(2.5rem, 6vw, 4rem) 1rem' }}>
      <p className="eyebrow">Legal</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '2.5rem' }}>Last updated: 14 August 2026</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {sections.map((s, i) => (
          <section key={i}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{s.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7 }}>{s.body}</p>
          </section>
        ))}
      </div>

      <div className="card" style={{ marginTop: '2.5rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Mail size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.9375rem' }}>
          Questions or data requests: <a href="mailto:lyn.nyx.store@gmail.com" style={{ color: 'var(--primary)', fontWeight: 500 }}>lyn.nyx.store@gmail.com</a>
        </span>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        <Link href="/" style={{ color: 'var(--primary)' }}>Back to Lyn-nyx Stores</Link>
      </p>
    </div>
  );
}