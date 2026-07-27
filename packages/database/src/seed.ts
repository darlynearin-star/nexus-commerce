import prisma from './index';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { ProductStatus } from '@prisma/client';

async function main() {
  console.log('Seeding database...');

  // Reset all data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.media.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.storeEmail.deleteMany();
  await prisma.storeTheme.deleteMany();
  await prisma.storeSettings.deleteMany();
  await prisma.store.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.developer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.killSwitch.deleteMany();
  await prisma.setting.deleteMany();

  await prisma.killSwitch.create({ data: {} });

  await prisma.setting.createMany({
    data: [
      { key: 'store_name', value: '"Adorn"' },
      { key: 'store_tagline', value: '"Your Style, Elevated"' },
      { key: 'store_email', value: '"hello@adorn.com"' },
      { key: 'store_phone', value: '"+256 755 123456"' },
      { key: 'store_address', value: '"Plot 45, Kampala Road, Kampala, Uganda"' },
      { key: 'currency', value: '"UGX"' },
      { key: 'tax_rate', value: '0.18' },
      { key: 'shipping_free_threshold', value: '150000' },
      { key: 'shipping_standard_rate', value: '15000' },
      { key: 'maintenance_mode', value: 'false' },
    ],
  });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nexuscommerce.com',
      passwordHash, firstName: 'Admin', lastName: 'User',
      role: 'SUPER_DEVELOPER', emailVerified: true,
    },
  });
  await prisma.developer.create({ data: { userId: adminUser.id } });

  const retailerUser = await prisma.user.create({
    data: {
      email: 'retailer@nexuscommerce.com',
      passwordHash, firstName: 'Retail', lastName: 'Manager',
      role: 'RETAILER', emailVerified: true,
    },
  });
  await prisma.retailer.create({
    data: { userId: retailerUser.id, storeName: 'Adorn Boutique', storeSlug: 'adorn-boutique' },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@nexuscommerce.com',
      passwordHash, firstName: 'Jane', lastName: 'Shopper',
      role: 'CUSTOMER', emailVerified: true,
    },
  });
  const customer = await prisma.customer.create({ data: { userId: customerUser.id } });

  // Main Store
  const mainStore = await prisma.store.create({
    data: {
      name: 'Adorn', slug: 'adorn', ownerId: adminUser.id,
      theme: { create: { template: 'elegance', colors: JSON.stringify({ primary: '#D4A843', secondary: '#A8822E', bg: '#0A0A0A', surface: '#141414', text: '#FAFAFA', accent: '#F0D48A' }) } },
      settings: { create: { currency: 'UGX', taxRate: 18, location: 'Kampala, Uganda' } },
    },
  });

  // Secondary demo store
  await prisma.store.create({
    data: {
      name: 'Luxe Vault', slug: 'luxe-vault', ownerId: retailerUser.id,
      theme: { create: { template: 'bold', colors: JSON.stringify({ primary: '#FF4433', secondary: '#CC3322', bg: '#0A0A0A', surface: '#1A1A1A', text: '#FAFAFA', accent: '#FF6655' }) } },
      settings: { create: { currency: 'UGX', taxRate: 18, location: 'Kampala, Uganda' } },
    },
  });

  const s = mainStore.id;

  const categories = await Promise.all([
    prisma.category.create({ data: { storeId: s, name: 'Jewelry', slug: 'jewelry', description: 'Necklaces, rings, earrings, bracelets and fine body ornaments' } }),
    prisma.category.create({ data: { storeId: s, name: 'Watches', slug: 'watches', description: 'Premium timepieces for every occasion' } }),
    prisma.category.create({ data: { storeId: s, name: 'Bags & Wallets', slug: 'bags-wallets', description: 'Handbags, totes, backpacks and leather goods' } }),
    prisma.category.create({ data: { storeId: s, name: 'Clothing', slug: 'clothing', description: 'Curated apparel from casual to formal' } }),
    prisma.category.create({ data: { storeId: s, name: 'Shoes', slug: 'shoes', description: 'Footwear crafted for style and comfort' } }),
    prisma.category.create({ data: { storeId: s, name: 'Accessories', slug: 'accessories', description: 'Belts, scarves, sunglasses, hats and more' } }),
  ]);

  await Promise.all([
    prisma.category.create({ data: { storeId: s, name: 'Necklaces', slug: 'necklaces', description: '', parentId: categories[0].id } }),
    prisma.category.create({ data: { storeId: s, name: 'Rings', slug: 'rings', description: '', parentId: categories[0].id } }),
    prisma.category.create({ data: { storeId: s, name: 'Earrings', slug: 'earrings', description: '', parentId: categories[0].id } }),
    prisma.category.create({ data: { storeId: s, name: 'Bracelets', slug: 'bracelets', description: '', parentId: categories[0].id } }),
    prisma.category.create({ data: { storeId: s, name: "Men's Clothing", slug: 'mens-clothing', description: '', parentId: categories[3].id } }),
    prisma.category.create({ data: { storeId: s, name: "Women's Clothing", slug: 'womens-clothing', description: '', parentId: categories[3].id } }),
    prisma.category.create({ data: { storeId: s, name: 'Outerwear', slug: 'outerwear', description: '', parentId: categories[3].id } }),
    prisma.category.create({ data: { storeId: s, name: 'Sunglasses', slug: 'sunglasses', description: '', parentId: categories[5].id } }),
    prisma.category.create({ data: { storeId: s, name: 'Belts', slug: 'belts', description: '', parentId: categories[5].id } }),
    prisma.category.create({ data: { storeId: s, name: 'Scarves', slug: 'scarves', description: '', parentId: categories[5].id } }),
  ]);

  const brands = await Promise.all([
    prisma.brand.create({ data: { storeId: s, name: 'Adorn', slug: 'adorn', description: 'House brand — curated elegance' } }),
    prisma.brand.create({ data: { storeId: s, name: 'LuxeCraft', slug: 'luxecraft', description: 'Artisanal accessories crafted with care' } }),
    prisma.brand.create({ data: { storeId: s, name: 'VogueLine', slug: 'vogueline', description: 'Contemporary fashion for the modern wardrobe' } }),
    prisma.brand.create({ data: { storeId: s, name: 'UrbanThreads', slug: 'urbans-threads', description: 'Street-ready style with urban edge' } }),
    prisma.brand.create({ data: { storeId: s, name: 'SilverOak', slug: 'silveroak', description: 'Premium leather goods and timepieces' } }),
  ]);

  const [j, w, b, c, sh, a] = categories;

  interface ProductSeed { storeId: string; name: string; slug: string; brand: string; sku: string; description: string; price: number; stock: number; status: ProductStatus; categoryId: string; tags: string[]; features: string[]; isFeatured?: boolean; isNew?: boolean; specifications: Record<string,string>; seoTitle: string; seoDescription: string; }

  const productData: ProductSeed[] = [
    { storeId: s, name: 'Sterling Silver Chain Necklace', slug: 'sterling-silver-chain-necklace', brand: 'adorn', sku: 'AD-JW-001', description: 'Timeless sterling silver chain necklace with a polished finish. Features an adjustable 18–22 inch length with secure lobster clasp. Handcrafted for daily wear.', price: 350000, stock: 120, status: 'PUBLISHED', categoryId: j.id, tags: ['necklace','silver','jewelry','minimalist','daily-wear'], features: ['Polished 925 sterling silver','Adjustable 18-22 inch length','Lobster clasp closure','Hypoallergenic','Includes gift pouch'], isFeatured: true, isNew: true, specifications: { Material: '925 Sterling Silver', Length: '18-22 inches (adjustable)', Clasp: 'Lobster', Weight: '6.2g' }, seoTitle: 'Sterling Silver Chain Necklace - Adorn', seoDescription: 'Timeless sterling silver chain necklace with polished finish.' },
    { storeId: s, name: 'Italian Leather Minimalist Watch', slug: 'italian-leather-minimalist-watch', brand: 'silveroak', sku: 'SO-WT-001', description: 'Clean, minimalist timepiece with genuine Italian leather strap, sapphire crystal face, and Japanese quartz movement. Water resistant to 50m.', price: 950000, stock: 45, status: 'PUBLISHED', categoryId: w.id, tags: ['watch','leather','minimalist','dress','italian'], features: ['Genuine Italian leather strap','Sapphire crystal face','Japanese quartz movement','50m water resistance','2-year warranty'], isFeatured: true, specifications: { Movement: 'Japanese Quartz', Case: '316L Stainless Steel 40mm', Strap: 'Italian Leather 20mm', 'Water Resistance': '50m' }, seoTitle: 'Italian Leather Minimalist Watch - SilverOak', seoDescription: 'Minimalist timepiece with Italian leather strap and sapphire crystal.' },
    { storeId: s, name: 'Italian Leather Crossbody Bag', slug: 'italian-leather-crossbody-bag', brand: 'silveroak', sku: 'SO-BG-001', description: 'Handcrafted Italian leather crossbody bag with adjustable strap, multiple interior pockets, and magnetic snap closure. Perfect for everyday carry.', price: 1200000, stock: 30, status: 'PUBLISHED', categoryId: b.id, tags: ['bag','crossbody','leather','italian','everyday'], features: ['Full-grain Italian leather','Adjustable crossbody strap','Magnetic snap closure','Interior zip and slip pockets','Antique brass hardware'], isFeatured: true, isNew: true, specifications: { Material: 'Full-Grain Italian Leather', Dimensions: '10 x 7 x 3 inches', 'Strap Drop': '22 inches max', Hardware: 'Antique Brass' }, seoTitle: 'Italian Leather Crossbody Bag - SilverOak', seoDescription: 'Handcrafted Italian leather crossbody bag for everyday elegance.' },
    { storeId: s, name: 'Aviator Gradient Sunglasses', slug: 'aviator-gradient-sunglasses', brand: 'vogueline', sku: 'VL-SG-001', description: 'Classic aviator sunglasses with gradient lenses, lightweight titanium frame, and UV400 protection. Includes hard case and cleaning cloth.', price: 550000, stock: 80, status: 'PUBLISHED', categoryId: a.id, tags: ['sunglasses','aviator','gradient','uv-protection','titanium'], features: ['UV400 protection','Lightweight titanium frame','Gradient brown lenses','Adjustable nose pads','Includes hard case'], isFeatured: true, specifications: { 'Frame Material': 'Titanium', Lens: 'Gradient Brown', 'UV Protection': 'UV400', 'Lens Width': '58mm', Includes: 'Hard case + cleaning cloth' }, seoTitle: 'Aviator Gradient Sunglasses - VogueLine', seoDescription: 'Classic aviator sunglasses with gradient lenses and titanium frame.' },
    { storeId: s, name: 'Cashmere Blend Infinity Scarf', slug: 'cashmere-blend-infinity-scarf', brand: 'adorn', sku: 'AD-SC-001', description: 'Luxuriously soft cashmere blend infinity scarf in a classic herringbone pattern. Dual-layer design for extra warmth and drape.', price: 280000, stock: 65, status: 'PUBLISHED', categoryId: a.id, tags: ['scarf','cashmere','infinity','winter','warm'], features: ['30% cashmere, 70% merino wool blend','Classic herringbone pattern','Dual-layer infinity design','Hypoallergenic','Hand wash recommended'], isFeatured: true, isNew: true, specifications: { Material: '30% Cashmere / 70% Merino Wool', Dimensions: '60 x 20 inches', Pattern: 'Herringbone', Care: 'Hand wash cold, lay flat to dry' }, seoTitle: 'Cashmere Blend Infinity Scarf - Adorn', seoDescription: 'Luxuriously soft cashmere blend infinity scarf.' },
    { storeId: s, name: 'Woven Leather Braided Belt', slug: 'woven-leather-braided-belt', brand: 'luxecraft', sku: 'LC-BT-001', description: 'Hand-braided genuine leather belt with a polished brass buckle. One size fits most with adjustable fit. Artisan crafted.', price: 250000, stock: 90, status: 'PUBLISHED', categoryId: a.id, tags: ['belt','leather','braided','woven','artisan'], features: ['Genuine full-grain leather','Hand-braided construction','Polished brass buckle','One size fits most','Artisan crafted in USA'], isFeatured: true, specifications: { Material: 'Full-Grain Leather', Buckle: 'Polished Brass', Width: '1.5 inches', Fit: 'Adjustable 30-42 inches' }, seoTitle: 'Woven Leather Braided Belt - LuxeCraft', seoDescription: 'Hand-braided genuine leather belt with brass buckle.' },
    { storeId: s, name: 'Rose Gold Hoop Earrings', slug: 'rose-gold-hoop-earrings', brand: 'vogueline', sku: 'VL-JW-001', description: 'Elegant rose gold hoop earrings with a subtle hammered texture. Lightweight and comfortable for all-day wear. Set of two.', price: 200000, stock: 200, status: 'PUBLISHED', categoryId: j.id, tags: ['earrings','hoop','rose-gold','minimalist','women'], features: ['Hypoallergenic rose gold plating','Hammered texture finish','Lightweight design','Secure butterfly backing','Nickel-free'], isFeatured: true, isNew: true, specifications: { Material: 'Rose Gold Plated Brass', Diameter: '1.5 inches', Backing: 'Butterfly', Weight: '4.8g (pair)', Hypoallergenic: 'Yes — Nickel Free' }, seoTitle: 'Rose Gold Hoop Earrings - VogueLine', seoDescription: 'Elegant rose gold hoop earrings with hammered texture.' },
    { storeId: s, name: 'Tailored Linen Blazer', slug: 'tailored-linen-blazer', brand: 'vogueline', sku: 'VL-CL-001', description: 'Lightweight tailored blazer in premium linen. Single-breasted with notched lapels, patch pockets, and natural horn buttons.', price: 850000, stock: 35, status: 'PUBLISHED', categoryId: c.id, tags: ['blazer','linen','tailored','summer','formal-casual'], features: ['Premium Italian linen','Single-breasted two-button closure','Notched lapels','Patch pockets','Natural horn buttons'], isFeatured: true, specifications: { Material: '100% Italian Linen', Fit: 'Tailored / Slim', Closure: 'Two-button', Lining: 'Cupro half-lined', Care: 'Dry clean recommended' }, seoTitle: 'Tailored Linen Blazer - VogueLine', seoDescription: 'Lightweight tailored blazer in premium Italian linen.' },
    { storeId: s, name: 'Signature Silk Blouse', slug: 'signature-silk-blouse', brand: 'urbans-threads', sku: 'UT-CL-001', description: 'Luxurious silk charmeuse blouse with a relaxed fit, hidden button placket, and elegant drape. Versatile for office or evening.', price: 620000, stock: 55, status: 'PUBLISHED', categoryId: c.id, tags: ['blouse','silk','women','office','evening'], features: ['100% silk charmeuse','Relaxed fit','Hidden button placket','Mother-of-pearl buttons','Versatile day-to-night design'], isFeatured: true, isNew: true, specifications: { Material: '100% Silk Charmeuse', Fit: 'Relaxed', Care: 'Hand wash or dry clean', 'Available In': 'Ivory, Blush, Navy, Black' }, seoTitle: 'Signature Silk Blouse - UrbanThreads', seoDescription: 'Luxurious silk charmeuse blouse with relaxed fit.' },
    { storeId: s, name: 'Handcrafted Leather Tote', slug: 'handcrafted-leather-tote', brand: 'silveroak', sku: 'SO-BG-002', description: 'Spacious handcrafted leather tote with reinforced stitching, interior organizer pockets, and matching zip pouch. Fits a 15-inch laptop.', price: 1400000, stock: 25, status: 'PUBLISHED', categoryId: b.id, tags: ['tote','leather','work','laptop-bag','professional'], features: ['Full-grain leather','Fits 15-inch laptop','Interior organizer with 6 pockets','Matching zip pouch included','Reinforced rolled handles'], isFeatured: true, specifications: { Material: 'Full-Grain Leather', Dimensions: '16 x 13 x 5 inches', 'Handle Drop': '8 inches', Interior: '1 zip pocket, 5 slip pockets', 'Laptop Fit': 'Up to 15-inch' }, seoTitle: 'Handcrafted Leather Tote - SilverOak', seoDescription: 'Spacious handcrafted leather tote with organizer pockets.' },
    { storeId: s, name: 'Classic Aviator Leather Jacket', slug: 'classic-aviator-leather-jacket', brand: 'urbans-threads', sku: 'UT-CL-002', description: 'Iconic aviator jacket in supple lambskin leather with shearling collar, zip front, and ribbed cuffs. A timeless wardrobe staple.', price: 2500000, stock: 20, status: 'PUBLISHED', categoryId: c.id, tags: ['jacket','leather','aviator','outerwear','classic'], features: ['Premium lambskin leather','Removable shearling collar','Heavy-duty YKK zipper','Ribbed cuffs and hem','Interior pocket'], isFeatured: true, isNew: true, specifications: { Material: 'Lambskin Leather', Collar: 'Removable Shearling', Closure: 'YKK Zipper', Lining: 'Polyester quilted lining', Care: 'Professional leather clean only' }, seoTitle: 'Classic Aviator Leather Jacket - UrbanThreads', seoDescription: 'Iconic aviator jacket in supple lambskin leather.' },
    { storeId: s, name: 'Minimalist Sterling Silver Ring', slug: 'minimalist-sterling-silver-ring', brand: 'adorn', sku: 'AD-JW-002', description: 'Sleek minimalist band in polished 925 sterling silver. Comfort-fit interior for all-day wear. Stackable design.', price: 160000, stock: 150, status: 'PUBLISHED', categoryId: j.id, tags: ['ring','silver','minimalist','stackable','unisex'], features: ['Polished 925 sterling silver','Comfort-fit interior','Stackable design','Unisex sizing','Hypoallergenic'], isFeatured: true, isNew: true, specifications: { Material: '925 Sterling Silver', Width: '3mm', Style: 'Comfort-fit band', 'Available Sizes': '5-13 (including half sizes)' }, seoTitle: 'Minimalist Sterling Silver Ring - Adorn', seoDescription: 'Sleek minimalist sterling silver band for everyday wear.' },
    { storeId: s, name: 'Structured Canvas Backpack', slug: 'structured-canvas-backpack', brand: 'luxecraft', sku: 'LC-BG-001', description: 'Structured waxed canvas backpack with genuine leather trim, padded laptop compartment, and multiple organizer pockets.', price: 700000, stock: 60, status: 'PUBLISHED', categoryId: b.id, tags: ['backpack','canvas','leather','travel','laptop'], features: ['Waxed canvas exterior','Genuine leather trim','Padded 15-inch laptop sleeve','Organizer panel','Roll-top closure'], isFeatured: true, specifications: { Material: 'Waxed Canvas + Leather', Dimensions: '18 x 12 x 6 inches', 'Laptop Compartment': 'Up to 15-inch', Closure: 'Roll-top + Buckle', Strap: 'Adjustable' }, seoTitle: 'Structured Canvas Backpack - LuxeCraft', seoDescription: 'Waxed canvas backpack with leather trim and laptop compartment.' },
    { storeId: s, name: 'Italian Leather Loafers', slug: 'italian-leather-loafers', brand: 'silveroak', sku: 'SO-SH-001', description: 'Hand-stitched Italian leather loafers with a classic penny strap, leather sole, and cushioned insole. Dress up or down with ease.', price: 1050000, stock: 40, status: 'PUBLISHED', categoryId: sh.id, tags: ['loafers','leather','italian','dress','casual'], features: ['Hand-stitched Italian calf leather','Classic penny strap design','Leather outsole with rubber heel','Cushioned leather insole','Goodyear welted'], isFeatured: true, isNew: true, specifications: { Material: 'Italian Calf Leather', Sole: 'Leather + Rubber Heel', Construction: 'Goodyear Welted', Fit: 'True to size', 'Made In': 'Italy' }, seoTitle: 'Italian Leather Loafers - SilverOak', seoDescription: 'Hand-stitched Italian leather loafers with classic penny strap.' },
  ];

  const products = await Promise.all(productData.map(d => prisma.product.create({ data: d })));

  // Variants
  await prisma.productVariant.createMany({
    data: [
      { productId: products[1].id, name: 'Silver Case / Black Strap', sku: 'SO-WT-001-BLK', price: 950000, stock: 15, options: JSON.stringify([{ name: 'Case Color', value: 'Silver' }, { name: 'Strap Color', value: 'Black' }]) },
      { productId: products[1].id, name: 'Silver Case / Brown Strap', sku: 'SO-WT-001-BRN', price: 950000, stock: 15, options: JSON.stringify([{ name: 'Case Color', value: 'Silver' }, { name: 'Strap Color', value: 'Brown' }]) },
      { productId: products[1].id, name: 'Gold Case / Tan Strap', sku: 'SO-WT-001-TAN', price: 1050000, stock: 15, options: JSON.stringify([{ name: 'Case Color', value: 'Gold' }, { name: 'Strap Color', value: 'Tan' }]) },
      { productId: products[8].id, name: 'Ivory', sku: 'UT-CL-001-IVR', price: 620000, stock: 15, options: JSON.stringify([{ name: 'Color', value: 'Ivory' }]) },
      { productId: products[8].id, name: 'Blush', sku: 'UT-CL-001-BLS', price: 620000, stock: 15, options: JSON.stringify([{ name: 'Color', value: 'Blush' }]) },
      { productId: products[8].id, name: 'Navy', sku: 'UT-CL-001-NVY', price: 650000, stock: 15, options: JSON.stringify([{ name: 'Color', value: 'Navy' }]) },
      { productId: products[8].id, name: 'Black', sku: 'UT-CL-001-BLK', price: 620000, stock: 10, options: JSON.stringify([{ name: 'Color', value: 'Black' }]) },
      { productId: products[11].id, name: 'Size 6', sku: 'AD-JW-002-S6', price: 160000, stock: 25, options: JSON.stringify([{ name: 'Size', value: '6' }]) },
      { productId: products[11].id, name: 'Size 7', sku: 'AD-JW-002-S7', price: 160000, stock: 25, options: JSON.stringify([{ name: 'Size', value: '7' }]) },
      { productId: products[11].id, name: 'Size 8', sku: 'AD-JW-002-S8', price: 160000, stock: 25, options: JSON.stringify([{ name: 'Size', value: '8' }]) },
      { productId: products[11].id, name: 'Size 9', sku: 'AD-JW-002-S9', price: 160000, stock: 25, options: JSON.stringify([{ name: 'Size', value: '9' }]) },
    ],
  });

  await prisma.review.createMany({
    data: [
      { storeId: s, productId: products[0].id, customerId: customer.id, rating: 5, title: 'Stunning necklace!', content: 'The silver is so shiny and the chain feels substantial. Love the adjustable length.', isApproved: true, isVerifiedPurchase: true },
      { storeId: s, productId: products[0].id, customerId: customer.id, rating: 4, title: 'Beautiful but delicate', content: 'Looks gorgeous but needs gentle care. The clasp could be slightly larger.', isApproved: true, isVerifiedPurchase: true },
      { storeId: s, productId: products[3].id, customerId: customer.id, rating: 5, title: 'Perfect sunglasses', content: 'Lightweight, great gradient tint, and the titanium frame is barely noticeable. Worth every penny.', isApproved: true, isVerifiedPurchase: true },
      { storeId: s, productId: products[6].id, customerId: customer.id, rating: 5, title: 'Love these hoops', content: 'They are the perfect size, not too big, not too small. The hammered texture catches the light beautifully.', isApproved: true, isVerifiedPurchase: true },
    ],
  });

  const order = await prisma.order.create({
    data: {
      storeId: s, orderNumber: 'ADORN-001',
      customerId: customer.id, status: 'COMPLETED',
      subtotal: 950000, shippingCost: 0, taxAmount: 171000, total: 1121000,
      paymentStatus: 'PAID', paymentMethod: 'Visa **** 4242',
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id, productId: products[1].id,
      productName: 'Italian Leather Minimalist Watch', sku: 'SO-WT-001',
      quantity: 1, unitPrice: 950000, totalPrice: 950000,
    },
  });

  console.log('Seed completed successfully!');
  console.log('---');
  console.log('Store: Adorn — Your Style, Elevated');
  console.log('Currency: UGX');
  console.log('Admin (super_developer): admin@nexuscommerce.com / Password123!');
  console.log('Retailer: retailer@nexuscommerce.com / Password123!');
  console.log('Customer: customer@nexuscommerce.com / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
