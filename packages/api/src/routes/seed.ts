import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const seedRouter = Router();
seedRouter.use(authenticate);

seedRouter.post('/categories', async (req: AuthRequest, res, next) => {
  try {
    const storeId = (req as any).storeId;
    if (!storeId) return res.status(400).json({ success: false, error: 'Store not resolved' });
    const existing = await prisma.category.count({ where: { storeId } });
    if (existing > 0) return res.json({ success: true, data: { created: 0, message: `${existing} categories already exist` } });

    let created = 0;
    const usedSlugs = new Set<string>();

    async function createTree(tree: any[], parentId: string | null) {
      for (const node of tree) {
        let slug = node.slug;
        if (usedSlugs.has(slug)) { let n = 1; while (usedSlugs.has(`${slug}-${n}`)) n++; slug = `${slug}-${n}`; }
        usedSlugs.add(slug);
        const cat = await prisma.category.create({ data: { storeId, name: node.name, slug, description: '', parentId } });
        created++;
        if (node.children) await createTree(node.children, cat.id);
      }
    }

    await createTree(JIJI_CATEGORIES, null);
    logger.info(`Seed: created ${created} categories for store ${storeId}`);
    res.json({ success: true, data: { created } });
  } catch (e: any) {
    logger.warn(`Seed categories failed: ${e.message}`);
    next(e);
  }
});

const JIJI_CATEGORIES = [
  { name: 'Vehicles', slug: 'vehicles', children: [
    { name: 'Cars', slug: 'cars' },
    { name: 'Motorcycles & Scooters', slug: 'motorcycles-scooters' },
    { name: 'Buses & Microbuses', slug: 'buses-microbuses' },
    { name: 'Vehicle Parts & Accessories', slug: 'vehicle-parts-accessories' },
    { name: 'Trucks & Trailers', slug: 'trucks-trailers' },
    { name: 'Boats & Watercraft', slug: 'boats-watercraft' },
    { name: 'Heavy Equipment', slug: 'heavy-equipment' },
    { name: 'Car Audio & Electronics', slug: 'car-audio-electronics' },
    { name: 'Other Vehicles', slug: 'other-vehicles' },
  ]},
  { name: 'Property', slug: 'property', children: [
    { name: 'Houses & Apartments for Sale', slug: 'houses-apartments-sale' },
    { name: 'Houses & Apartments for Rent', slug: 'houses-apartments-rent' },
    { name: 'Short Let & Vacation Rentals', slug: 'short-let-vacation-rentals' },
    { name: 'Land & Plots', slug: 'land-plots' },
    { name: 'Commercial Property for Sale', slug: 'commercial-property-sale' },
    { name: 'Commercial Property for Rent', slug: 'commercial-property-rent' },
    { name: 'New Builds', slug: 'new-builds' },
    { name: 'Rooms for Rent / Shared', slug: 'rooms-rent-shared' },
    { name: 'Other Property', slug: 'other-property' },
  ]},
  { name: 'Electronics', slug: 'electronics', children: [
    { name: 'Phones & Tablets', slug: 'phones-tablets', children: [
      { name: 'Smartphones', slug: 'smartphones' },
      { name: 'Tablets', slug: 'tablets' },
      { name: 'Phone & Tablet Accessories', slug: 'phone-tablet-accessories' },
    ]},
    { name: 'TV & Audio', slug: 'tv-audio', children: [
      { name: 'TVs', slug: 'tvs' },
      { name: 'Home Audio & Speakers', slug: 'home-audio-speakers' },
      { name: 'Headphones', slug: 'headphones' },
    ]},
    { name: 'Computers & Laptops', slug: 'computers-laptops', children: [
      { name: 'Laptops', slug: 'laptops' },
      { name: 'Desktop Computers', slug: 'desktop-computers' },
      { name: 'Computer Accessories', slug: 'computer-accessories' },
    ]},
    { name: 'Gaming', slug: 'gaming', children: [
      { name: 'Gaming Consoles', slug: 'gaming-consoles' },
      { name: 'Video Games', slug: 'video-games' },
    ]},
    { name: 'Cameras & Photography', slug: 'cameras-photography' },
    { name: 'Wearable Technology', slug: 'wearable-technology' },
    { name: 'Other Electronics', slug: 'other-electronics' },
  ]},
  { name: 'Fashion', slug: 'fashion', children: [
    { name: 'Women\'s Fashion', slug: 'womens-fashion', children: [
      { name: 'Women\'s Clothing', slug: 'womens-clothing' },
      { name: 'Women\'s Shoes', slug: 'womens-shoes' },
      { name: 'Women\'s Bags', slug: 'womens-bags' },
      { name: 'Women\'s Jewelry', slug: 'womens-jewelry' },
      { name: 'Women\'s Watches', slug: 'womens-watches' },
      { name: 'Clothing Accessories', slug: 'womens-clothing-accessories' },
    ]},
    { name: 'Men\'s Fashion', slug: 'mens-fashion', children: [
      { name: 'Men\'s Clothing', slug: 'mens-clothing' },
      { name: 'Men\'s Shoes', slug: 'mens-shoes' },
      { name: 'Men\'s Bags', slug: 'mens-bags' },
      { name: 'Men\'s Jewelry', slug: 'mens-jewelry' },
      { name: 'Men\'s Watches', slug: 'mens-watches' },
    ]},
    { name: 'Kids\' Fashion', slug: 'kids-fashion', children: [
      { name: 'Kids\' Clothing', slug: 'kids-clothing' },
      { name: 'Kids\' Shoes', slug: 'kids-shoes' },
      { name: 'Baby Clothing', slug: 'baby-clothing' },
    ]},
    { name: 'Wedding Wear', slug: 'wedding-wear' },
    { name: 'Traditional Wear', slug: 'traditional-wear' },
    { name: 'Other Fashion', slug: 'other-fashion' },
  ]},
  { name: 'Home & Garden', slug: 'home-garden', children: [
    { name: 'Furniture', slug: 'furniture' },
    { name: 'Home Appliances', slug: 'home-appliances' },
    { name: 'Kitchen & Dining', slug: 'kitchen-dining' },
    { name: 'Bedding & Bath', slug: 'bedding-bath' },
    { name: 'Garden & Outdoor', slug: 'garden-outdoor' },
    { name: 'Tools & Hardware', slug: 'tools-hardware' },
    { name: 'Lighting & Decor', slug: 'lighting-decor' },
    { name: 'Other Home & Garden', slug: 'other-home-garden' },
  ]},
  { name: 'Health & Beauty', slug: 'health-beauty', children: [
    { name: 'Makeup & Cosmetics', slug: 'makeup-cosmetics' },
    { name: 'Skincare', slug: 'skincare' },
    { name: 'Hair Care', slug: 'hair-care' },
    { name: 'Fragrance', slug: 'fragrance' },
    { name: 'Personal Care', slug: 'personal-care' },
    { name: 'Vitamins & Supplements', slug: 'vitamins-supplements' },
    { name: 'Medical Equipment', slug: 'medical-equipment' },
    { name: 'Other Health & Beauty', slug: 'other-health-beauty' },
  ]},
  { name: 'Sports & Fitness', slug: 'sports-fitness', children: [
    { name: 'Gym & Fitness Equipment', slug: 'gym-fitness-equipment' },
    { name: 'Sportswear', slug: 'sportswear' },
    { name: 'Sports Equipment', slug: 'sports-equipment' },
    { name: 'Cycling', slug: 'cycling' },
    { name: 'Camping & Hiking', slug: 'camping-hiking' },
    { name: 'Fishing', slug: 'fishing' },
    { name: 'Other Sports & Fitness', slug: 'other-sports-fitness' },
  ]},
  { name: 'Food & Drinks', slug: 'food-drinks', children: [
    { name: 'Groceries', slug: 'groceries' },
    { name: 'Beverages', slug: 'beverages' },
    { name: 'Snacks & Confectionery', slug: 'snacks-confectionery' },
    { name: 'Fresh Produce', slug: 'fresh-produce' },
    { name: 'Meat & Seafood', slug: 'meat-seafood' },
    { name: 'Cooking & Baking', slug: 'cooking-baking' },
    { name: 'Other Food', slug: 'other-food' },
  ]},
  { name: 'Babies & Kids', slug: 'babies-kids', children: [
    { name: 'Baby Gear', slug: 'baby-gear' },
    { name: 'Diapers & Potty', slug: 'diapers-potty' },
    { name: 'Feeding', slug: 'feeding' },
    { name: 'Baby Health & Safety', slug: 'baby-health-safety' },
    { name: 'Toys & Games', slug: 'toys-games' },
    { name: 'School Supplies', slug: 'school-supplies' },
    { name: 'Other Baby & Kids', slug: 'other-baby-kids' },
  ]},
  { name: 'Pets', slug: 'pets', children: [
    { name: 'Dogs', slug: 'dogs' },
    { name: 'Cats', slug: 'cats' },
    { name: 'Birds', slug: 'birds' },
    { name: 'Fish & Aquariums', slug: 'fish-aquariums' },
    { name: 'Pet Food & Treats', slug: 'pet-food-treats' },
    { name: 'Pet Accessories', slug: 'pet-accessories' },
    { name: 'Other Pets', slug: 'other-pets' },
  ]},
  { name: 'Books & Media', slug: 'books-media', children: [
    { name: 'Books', slug: 'books' },
    { name: 'Magazines', slug: 'magazines' },
    { name: 'Music', slug: 'music' },
    { name: 'Movies & TV Series', slug: 'movies-tv-series' },
    { name: 'Stationery', slug: 'stationery' },
    { name: 'Other Media', slug: 'other-media' },
  ]},
  { name: 'Services', slug: 'services', children: [
    { name: 'Professional Services', slug: 'professional-services' },
    { name: 'Home Services', slug: 'home-services' },
    { name: 'Event Planning', slug: 'event-planning' },
    { name: 'Photography & Videography', slug: 'photography-videography' },
    { name: 'IT & Web Services', slug: 'it-web-services' },
    { name: 'Transport & Logistics', slug: 'transport-logistics' },
    { name: 'Education & Tutoring', slug: 'education-tutoring' },
    { name: 'Health & Wellness Services', slug: 'health-wellness-services' },
    { name: 'Other Services', slug: 'other-services' },
  ]},
  { name: 'Jobs', slug: 'jobs', children: [
    { name: 'Accounting & Finance', slug: 'accounting-finance' },
    { name: 'Admin & Office', slug: 'admin-office' },
    { name: 'Agriculture & Farming', slug: 'agriculture-farming' },
    { name: 'Construction & Trades', slug: 'construction-trades' },
    { name: 'Customer Service', slug: 'customer-service' },
    { name: 'Education & Training', slug: 'education-training' },
    { name: 'Engineering', slug: 'engineering' },
    { name: 'Healthcare & Medical', slug: 'healthcare-medical' },
    { name: 'Hospitality & Tourism', slug: 'hospitality-tourism' },
    { name: 'Human Resources', slug: 'human-resources' },
    { name: 'IT & Telecoms', slug: 'it-telecoms' },
    { name: 'Legal', slug: 'legal' },
    { name: 'Manufacturing', slug: 'manufacturing' },
    { name: 'Marketing & Advertising', slug: 'marketing-advertising' },
    { name: 'Retail & Sales', slug: 'retail-sales' },
    { name: 'Transport & Logistics', slug: 'transport-logistics-jobs' },
    { name: 'Other Jobs', slug: 'other-jobs' },
  ]},
  { name: 'Agriculture', slug: 'agriculture', children: [
    { name: 'Livestock', slug: 'livestock' },
    { name: 'Poultry', slug: 'poultry' },
    { name: 'Crops & Seeds', slug: 'crops-seeds' },
    { name: 'Farm Machinery', slug: 'farm-machinery' },
    { name: 'Animal Feeds', slug: 'animal-feeds' },
    { name: 'Veterinary Services', slug: 'veterinary-services' },
    { name: 'Other Agriculture', slug: 'other-agriculture' },
  ]},
  { name: 'Business & Industry', slug: 'business-industry', children: [
    { name: 'Office Equipment', slug: 'office-equipment' },
    { name: 'Industrial Machinery', slug: 'industrial-machinery' },
    { name: 'Packaging & Labeling', slug: 'packaging-labeling' },
    { name: 'Cleaning Equipment', slug: 'cleaning-equipment' },
    { name: 'Safety & Security', slug: 'safety-security' },
    { name: 'Other Business & Industry', slug: 'other-business-industry' },
  ]},
  { name: 'Other Categories', slug: 'other-categories', children: [
    { name: 'Free Items', slug: 'free-items' },
    { name: 'Tickets', slug: 'tickets' },
    { name: 'Coupons & Vouchers', slug: 'coupons-vouchers' },
    { name: 'Lost & Found', slug: 'lost-found' },
    { name: 'Charity & Donations', slug: 'charity-donations' },
    { name: 'Miscellaneous', slug: 'miscellaneous' },
  ]},
];

export default seedRouter;
