/**
 * Ad video storyboards: one template = one aspect of the product.
 * Pasted URL + template → storyboard segments → screenshots + captions +
 * TTS → ffmpeg.
 */
export interface AdVideoTemplate {
  id: string;
  title: string;
  summary: string;
  formats: string[]; // e.g. ['9:16', '16:9']
  beats: { caption: string; voice: string; seconds: number; shot: string }[];
  // Tokens replaced per-URL at render time: {url}, {siteName}, {merchantCode}
}

export const AD_VIDEO_TEMPLATES: AdVideoTemplate[] = [
  {
    id: 'brand-intro',
    title: 'Brand Intro — what is Lyn-nyx Stores',
    summary: 'Hook on the brand promise (launch a store in minutes). Good for ads + social reels.',
    formats: ['9:16', '16:9'],
    beats: [
      { caption: 'Lyn-nyx Stores', voice: 'Lyn Nyx Stores. Launch a fashion store in minutes.', seconds: 3, shot: 'hero' },
      { caption: 'Pick a template. Add products. Start selling.', voice: 'Pick a template, add your products, and start selling across Uganda.', seconds: 4, shot: 'grid' },
      { caption: 'MTN MoMo & Airtel Pay built in', voice: 'MTN Mobile Money and Airtel Pay are built in.', seconds: 3, shot: 'checkout' },
      { caption: 'Start at {url}', voice: 'Start today at {url}.', seconds: 3, shot: 'cta' },
    ],
  },
  {
    id: 'create-store',
    title: 'Create a store — from signup to URL',
    summary: 'Step-by-step: signup → template → colors → publish URL.',
    formats: ['9:16', '16:9'],
    beats: [
      { caption: '1 — Create your store', voice: 'Create your store in minutes.', seconds: 3, shot: 'create' },
      { caption: '2 — Pick Elegance, Minimal, Bold or Nature', voice: 'Choose a template that fits your brand, then set your brass colors.', seconds: 4, shot: 'templates' },
      { caption: '3 — Your URL is live', voice: 'Share your Lyn-nyx Stores URL anywhere.', seconds: 4, shot: 'store' },
      { caption: '{url} → Try it', voice: 'Go to {url} to get started.', seconds: 2, shot: 'cta' },
    ],
  },
  {
    id: 'add-products',
    title: 'Add products — photos, prices, categories',
    summary: 'Show the product workflow: photos, titles, UGX pricing, stock, categories.',
    formats: ['9:16', '16:9'],
    beats: [
      { caption: 'Upload photos that sell', voice: 'Upload product photos from your phone.', seconds: 3, shot: 'product-form' },
      { caption: 'Set prices in UGX, choose a category', voice: 'Set a price in Uganda Shillings and confirm the category.', seconds: 4, shot: 'price' },
      { caption: 'Your item appears in the storefront', voice: 'Your item is live in the storefront instantly.', seconds: 3, shot: 'grid' },
      { caption: '{url}', voice: 'Sell at {url}.', seconds: 3, shot: 'cta' },
    ],
  },
  {
    id: 'mobile-money',
    title: 'Get paid — mobile money',
    summary: 'Pay-on-delivery + mobile-money collection (MTN + Airtel Pay) in one flow.',
    formats: ['9:16', '16:9'],
    beats: [
      { caption: 'Customers pay any way they like', voice: 'Customers pay on delivery, MTN MoMo, or Airtel Pay.', seconds: 3, shot: 'checkout' },
      { caption: 'Pay to merchant code {merchantCode}', voice: 'Or collect straight to your Airtel Pay merchant code.', seconds: 4, shot: 'momo-code' },
      { caption: 'Confirm from your statement', voice: 'You confirm each payment against your statement.', seconds: 3, shot: 'subscriptions' },
      { caption: '{url} → collect', voice: 'Collect at {url}.', seconds: 2, shot: 'cta' },
    ],
  },
  {
    id: 'share-store',
    title: 'Share your store — WhatsApp to Instagram',
    summary: 'Copy the store URL once, then share everywhere customers already shop.',
    formats: ['9:16', '16:9'],
    beats: [
      { caption: 'One link — everywhere', voice: 'One link for every customer.', seconds: 3, shot: 'store' },
      { caption: 'Paste it in WhatsApp, Facebook, IG', voice: 'Paste it in WhatsApp, Facebook, or Instagram.', seconds: 4, shot: 'share' },
      { caption: 'Every order shows up in the dashboard', voice: 'Orders appear in your dashboard instantly.', seconds: 4, shot: 'orders' },
      { caption: '{url}', voice: 'Your store is at {url}.', seconds: 2, shot: 'cta' },
    ],
  },
  {
    id: 'checkout-walkthrough',
    title: 'Buyer walkthrough — add to cart → paid',
    summary: 'A shopper adds to cart, enters delivery details + shipping, chooses a payment method, places the order.',
    formats: ['9:16', '16:9'],
    beats: [
      { caption: 'Browse. Add to cart.', voice: 'Browse and add to cart.', seconds: 3, shot: 'grid' },
      { caption: 'Delivery details + shipping', voice: 'Enter delivery details and choose a courier.', seconds: 4, shot: 'cart' },
      { caption: 'Choose MoMo, Airtel, or pay on delivery', voice: 'Pick your payment: Mobile Money, Airtel, or pay on delivery.', seconds: 4, shot: 'checkout' },
      { caption: 'Order placed — track in the dashboard', voice: 'Your order is placed. Track it in the dashboard.', seconds: 3, shot: 'orders' },
    ],
  },
  {
    id: 'theme-templates',
    title: 'Templates & brass — tailor the look',
    summary: 'Show the brass theme, Fraunces + Inter typography, and the four templates.',
    formats: ['9:16', '16:9'],
    beats: [
      { caption: 'Warm brass, editorial type', voice: 'Warm brass editorial commerce — Fraunces and Inter.', seconds: 3, shot: 'hero' },
      { caption: 'Four starting points', voice: 'Elegance, Minimal, Bold, and Nature.', seconds: 3, shot: 'templates' },
      { caption: 'Your colors, your brand', voice: 'Set your colors, upload your logo.', seconds: 3, shot: 'product-form' },
      { caption: '{url} → your look', voice: 'Make it yours at {url}.', seconds: 3, shot: 'cta' },
    ],
  },
];

export function getAdTemplate(id: string): AdVideoTemplate | undefined {
  return AD_VIDEO_TEMPLATES.find(t => t.id === id);
}
