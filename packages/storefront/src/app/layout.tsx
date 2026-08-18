import { Fraunces, Inter } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from '@/components/ClientProviders';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Lyn-nyx Stores: Shop, Sell, Scale',
    template: '%s | Lyn-nyx Stores',
  },
  description:
    'Create a personalized online fashion store in minutes. Pick a template, set your colors, add your products, and start selling across Uganda. No coding needed.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Lyn-nyx Stores',
    title: 'Lyn-nyx Stores: Shop, Sell, Scale',
    description:
      'Create a personalized online fashion store in minutes. Pick a template, set your colors, add your products, and start selling across Uganda. No coding needed.',
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyn-nyx Stores: Shop, Sell, Scale',
    description:
      'Create a personalized online fashion store in minutes. Pick a template, set your colors, add your products, and start selling across Uganda. No coding needed.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}