import Link from 'next/link';
import { Mail } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Lyn-nyx Stores',
  description: 'The terms that govern your use of Lyn-nyx Stores as a shopper, customer, or retailer.',
};

const sections = [
  {
    title: 'Acceptance of terms',
    body: 'By creating an account, creating a store, browsing the platform, or placing an order on Lyn-nyx Stores, you agree to these Terms of Service. If you are entering into these terms on behalf of a business, you confirm that you have the authority to bind that business. If you do not agree, do not use the platform.',
  },
  {
    title: 'The service',
    body: 'Lyn-nyx Stores is an online marketplace where retailers in Uganda create their own storefronts and customers buy from them. We provide the platform, storefront tools, order handling, and payment coordination. Retailers run their own stores and are responsible for their own products, listings, prices, and fulfilment. The platform is operated by Mr. Dev (lyn.nyx.store@gmail.com).',
  },
  {
    title: 'Accounts',
    body: 'You must provide accurate information when creating an account and keep your login credentials secure. Your account is personal: one email address = one account, and one email = one store. You are responsible for everything done through your account. We may suspend or close accounts that violate these terms, that are suspected of fraud or abuse, or that pose a risk to other users or to the platform.',
  },
  {
    title: 'Retailer responsibilities',
    body: 'When you create a store you agree to sell lawful products and services, provide accurate listings with honest descriptions and prices, honour the prices you display, fulfil orders in the delivery area you advertise, and comply with all applicable laws in Uganda. You remain solely responsible for the products you sell and for any claims arising from them. Store names and URLs must not mislead customers or impersonate other brands.',
  },
  {
    title: 'Orders and delivery',
    body: 'About their orders, customers deal directly with the retailer who owns the store. Retailers confirm, fulfil, and deliver orders, and are responsible for customer support and refunds for their own products. Lyn-nyx Stores facilitates the transaction and coordination, but the retailer is the seller of record.',
  },
  {
    title: 'Payments and subscription',
    body: 'Retailer subscriptions are billed weekly at 3,000 UGX after a 14-day free trial. The trial starts when your store is created. You can cancel your subscription or store at any time, and you will not be charged for weeks after cancellation. Customers pay for orders on delivery, on terms agreed between the customer and the retailer, using cash, MTN Mobile Money, or Airtel Money where offered.',
  },
  {
    title: 'Prohibited conduct',
    body: 'You may not use the platform to engage in fraud, sell counterfeit or illegal goods, harass or harm others, attempt to gain unauthorised access to any system or data, interfere with other stores, copy or scrape the platform, or otherwise use the service in a way that violates the law or these terms.',
  },
  {
    title: 'Intellectual property',
    body: 'The platform design, code, branding, and content belong to Lyn-nyx Stores. You keep ownership of your own content — your store name, logo, products, and listings — and grant us permission to host and display that content to operate the platform. You confirm you have the rights to any content you upload, including logos and product images.',
  },
  {
    title: 'Limitation of liability',
    body: 'The platform is provided as-is. To the maximum extent permitted by law, Lyn-nyx Stores is not liable for indirect or consequential damages, loss of profit, or data, or for the products sold by retailers. Our total liability relating to the platform will not exceed the amount you paid us in the twelve months before the claim.',
  },
  {
    title: 'Suspension and termination',
    body: 'We may suspend or terminate your account or store for violations of these terms, inactivity, non-payment of subscription fees, or conduct that harms the platform or its users. Subscription fees already paid are non-refundable, but you will not be charged after termination. You may stop using the platform and delete your store at any time by contacting us.',
  },
  {
    title: 'Changes to these terms',
    body: 'We may update these terms from time to time. When we do, the revised version will be posted here, and significant changes will be announced through the platform. Continued use of the platform after changes take effect means you accept the updated terms.',
  },
  {
    title: 'Governing law',
    body: 'These terms are governed by the laws of the Republic of Uganda. Any disputes will be handled through the courts of Uganda.',
  },
  {
    title: 'Contact',
    body: 'Questions about these terms can be sent to lyn.nyx.store@gmail.com. We are happy to clarify anything before you sign up.',
  },
];

export default function TermsPage() {
  return (
    <div className="container" style={{ maxWidth: 720, padding: 'clamp(2.5rem, 6vw, 4rem) 1rem' }}>
      <p className="eyebrow">Legal</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>Terms of Service</h1>
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
          Questions about these terms: <a href="mailto:lyn.nyx.store@gmail.com" style={{ color: 'var(--primary)', fontWeight: 500 }}>lyn.nyx.store@gmail.com</a>
        </span>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        <Link href="/" style={{ color: 'var(--primary)' }}>Back to Lyn-nyx Stores</Link>
      </p>
    </div>
  );
}