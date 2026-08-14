'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const BRAND = 'Lyn-nyx Stores';

interface RouteMeta {
  match: (seg: string[]) => boolean;
  title: string;
  description: string;
}

const routeMeta: RouteMeta[] = [
  { match: s => s.length === 0, title: `${BRAND}: Shop, Sell, Scale`, description: 'Create a personalized online fashion store in minutes. Pick a template, set your colors, add your products, and start selling across Uganda. No coding needed.' },
  { match: s => s[0] === 'shop', title: `Shop | ${BRAND}`, description: 'Browse products and collections across Lyn-nyx Stores.' },
  { match: s => s[0] === 'categories', title: `Categories | ${BRAND}`, description: 'Explore product categories and find what you are looking for.' },
  { match: s => s[0] === 'deals', title: `Deals | ${BRAND}`, description: 'Shop the latest deals and offers.' },
  { match: s => s[0] === 'wishlist', title: `Wishlist | ${BRAND}`, description: 'View and manage products you have saved to your wishlist.' },
  { match: s => s[0] === 'cart', title: `Cart | ${BRAND}`, description: 'Review the items in your shopping cart.' },
  { match: s => s[0] === 'checkout', title: `Checkout | ${BRAND}`, description: 'Complete your order with delivery details and pay on delivery.' },
  { match: s => s[0] === 'login', title: `Sign In | ${BRAND}`, description: 'Sign in to your Lyn-nyx Stores account.' },
  { match: s => s[0] === 'register', title: `Create Account | ${BRAND}`, description: 'Create a free Lyn-nyx Stores account and start shopping or selling.' },
  { match: s => s[0] === 'account', title: `Account | ${BRAND}`, description: 'Manage your orders, cart, notifications, and settings.' },
  { match: s => s[0] === 'create-store', title: `Create Your Store | ${BRAND}`, description: 'Launch your own online store in minutes. Free 14-day trial, then 3,000 UGX per week.' },
  { match: s => s[0] === 'guides', title: `Guides & Tutorials | ${BRAND}`, description: 'Step-by-step guides for shopping and running your own store on Lyn-nyx Stores.' },
  { match: s => s[0] === 'privacy', title: `Privacy Policy | ${BRAND}`, description: 'How Lyn-nyx Stores collects, uses, and protects your personal data.' },
  { match: s => s[0] === 'product' && s.length === 2, title: `Product | ${BRAND}`, description: 'View product details, pricing, and delivery options.' },
  { match: s => s[0] === 'store' && s.length === 2, title: `Store | ${BRAND}`, description: 'Browse a store catalog of fashion, accessories, and body ornaments.' },
  { match: s => s[0] === 'store' && s.length === 3 && s[2] === 'shop', title: `Shop | ${BRAND}`, description: 'Browse products, filter by category and price, and sort your results.' },
  { match: s => s[0] === 'store' && s.length === 4 && s[2] === 'product', title: `Product | ${BRAND}`, description: 'View product details, pricing, and place an order.' },
];

export default function SeoManager() {
  const pathname = usePathname() || '/';
  useEffect(() => {
    const seg = pathname.split('?')[0].split('/').filter(Boolean);
    const meta = routeMeta.find(r => r.match(seg)) || { title: BRAND, description: `Shop and sell on ${BRAND}.` };
    document.title = meta.title;
    let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.name = 'description';
      document.head.appendChild(el);
    }
    el.content = meta.description;
  }, [pathname]);
  return null;
}