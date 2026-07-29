import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';
import { logger } from '../utils/logger';

const jijiCategories = [
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
    { name: 'Parking & Storage', slug: 'parking-storage' },
  ]},
  { name: 'Phones & Tablets', slug: 'phones-tablets', children: [
    { name: 'Mobile Phones', slug: 'mobile-phones' },
    { name: 'Tablets', slug: 'tablets' },
    { name: 'Smart Watches', slug: 'smart-watches' },
    { name: 'Accessories for Phones & Tablets', slug: 'phone-tablet-accessories' },
    { name: 'Phone Parts & Repair Tools', slug: 'phone-parts-repair-tools' },
  ]},
  { name: 'Electronics', slug: 'electronics', children: [
    { name: 'Laptops & Computers', slug: 'laptops-computers' },
    { name: 'TV & Video Equipment', slug: 'tv-video-equipment' },
    { name: 'Video Game Consoles', slug: 'video-game-consoles' },
    { name: 'Audio & Music Equipment', slug: 'audio-music-equipment' },
    { name: 'Cameras & Photography', slug: 'cameras-photography' },
    { name: 'Computer Accessories', slug: 'computer-accessories' },
    { name: 'Printers & Scanners', slug: 'printers-scanners' },
    { name: 'Networking & Modems', slug: 'networking-modems' },
    { name: 'Monitors & Displays', slug: 'monitors-displays' },
    { name: 'Computer Components', slug: 'computer-components' },
    { name: 'Home Audio & Speakers', slug: 'home-audio-speakers' },
    { name: 'Car Electronics', slug: 'car-electronics' },
    { name: 'Security & Surveillance', slug: 'security-surveillance' },
    { name: 'Smart Home Devices', slug: 'smart-home-devices' },
    { name: 'Other Electronics', slug: 'other-electronics' },
  ]},
  { name: 'Home, Furniture & Appliances', slug: 'home-furniture-appliances', children: [
    { name: 'Furniture', slug: 'furniture' },
    { name: 'Lighting', slug: 'lighting' },
    { name: 'Storage & Organization', slug: 'storage-organization' },
    { name: 'Home Accessories & Decor', slug: 'home-accessories-decor' },
    { name: 'Kitchen & Dining', slug: 'kitchen-dining' },
    { name: 'Bedding & Bath', slug: 'bedding-bath' },
    { name: 'Major Appliances', slug: 'major-appliances' },
    { name: 'Small Kitchen Appliances', slug: 'small-kitchen-appliances' },
    { name: 'Garden & Outdoor', slug: 'garden-outdoor' },
  ]},
  { name: 'Fashion', slug: 'fashion', children: [
    { name: "Women's Fashion", slug: 'womens-fashion', children: [
      { name: "Women's Clothing", slug: 'womens-clothing' },
      { name: "Women's Shoes", slug: 'womens-shoes' },
      { name: "Women's Bags", slug: 'womens-bags' },
      { name: "Women's Jewelry", slug: 'womens-jewelry' },
      { name: "Women's Watches", slug: 'womens-watches' },
      { name: "Women's Clothing Accessories", slug: 'womens-clothing-accessories' },
      { name: "Women's Wedding Wear & Accessories", slug: 'womens-wedding-wear' },
    ]},
    { name: "Men's Fashion", slug: 'mens-fashion', children: [
      { name: "Men's Clothing", slug: 'mens-clothing' },
      { name: "Men's Shoes", slug: 'mens-shoes' },
      { name: "Men's Bags", slug: 'mens-bags' },
      { name: "Men's Jewelry", slug: 'mens-jewelry' },
      { name: "Men's Watches", slug: 'mens-watches' },
      { name: "Men's Clothing Accessories", slug: 'mens-clothing-accessories' },
      { name: "Men's Wedding Wear & Accessories", slug: 'mens-wedding-wear' },
    ]},
    { name: "Baby & Kids' Fashion", slug: 'baby-kids-fashion', children: [
      { name: "Children's Clothing", slug: 'childrens-clothing' },
      { name: "Children's Shoes", slug: 'childrens-shoes' },
      { name: "Babies & Kids Accessories", slug: 'babies-kids-accessories' },
    ]},
  ]},
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', children: [
    { name: 'Hair Beauty', slug: 'hair-beauty' },
    { name: 'Face Care & Skin Care', slug: 'face-care-skin-care' },
    { name: 'Oral Care', slug: 'oral-care' },
    { name: 'Body Care & Bath', slug: 'body-care-bath' },
    { name: 'Makeup & Cosmetics', slug: 'makeup-cosmetics' },
    { name: 'Fragrance & Deodorants', slug: 'fragrance-deodorants' },
    { name: 'Nail Care', slug: 'nail-care' },
    { name: "Men's Grooming", slug: 'mens-grooming' },
    { name: 'Beauty Tools & Accessories', slug: 'beauty-tools-accessories' },
    { name: 'Wellness & Relaxation', slug: 'wellness-relaxation' },
    { name: 'Other Beauty & Personal Care', slug: 'other-beauty-personal-care' },
  ]},
  { name: 'Medicine & Health Supplies', slug: 'medicine-health', children: [
    { name: 'Vitamins & Supplements', slug: 'vitamins-supplements' },
    { name: 'Herbal & Traditional Remedies', slug: 'herbal-remedies' },
    { name: 'First Aid & Emergency', slug: 'first-aid-emergency' },
    { name: 'Medical Equipment & Devices', slug: 'medical-equipment-devices' },
    { name: 'Pharmacy & Prescription', slug: 'pharmacy-prescription' },
    { name: 'Fitness & Nutrition', slug: 'fitness-nutrition' },
    { name: 'Sexual Wellness', slug: 'sexual-wellness' },
    { name: 'Eye Care & Vision', slug: 'eye-care-vision' },
    { name: 'Hearing & Audiology', slug: 'hearing-audiology' },
    { name: 'Orthopedic & Mobility Aids', slug: 'orthopedic-mobility-aids' },
    { name: 'Maternity & Baby Health', slug: 'maternity-baby-health' },
    { name: 'Other Health Supplies', slug: 'other-health-supplies' },
  ]},
  { name: 'Services', slug: 'services', children: [
    { name: 'Building & Trades Services', slug: 'building-trades-services' },
    { name: 'Car Services & Automotive', slug: 'car-services-automotive' },
    { name: 'Computer & IT Services', slug: 'computer-it-services' },
    { name: 'Repair Services', slug: 'repair-services' },
    { name: 'Cleaning & Domestic Services', slug: 'cleaning-domestic-services' },
    { name: 'Health & Beauty Services', slug: 'health-beauty-services' },
    { name: 'Photography & Videography', slug: 'photography-videography' },
    { name: 'Event Planning & Catering', slug: 'event-planning-catering' },
    { name: 'Tutoring & Education', slug: 'tutoring-education' },
    { name: 'Legal Services', slug: 'legal-services' },
    { name: 'Financial & Accounting Services', slug: 'financial-accounting-services' },
    { name: 'Marketing & Advertising', slug: 'marketing-advertising' },
    { name: 'Web & Mobile Development', slug: 'web-mobile-development' },
    { name: 'Writing & Translation', slug: 'writing-translation' },
    { name: 'Logistics & Delivery', slug: 'logistics-delivery' },
    { name: 'Moving & Relocation', slug: 'moving-relocation' },
    { name: 'Pet Services', slug: 'pet-services' },
    { name: 'Travel & Tours', slug: 'travel-tours' },
    { name: 'Fitness & Personal Training', slug: 'fitness-personal-training' },
    { name: 'Music & Entertainment', slug: 'music-entertainment' },
    { name: 'Printing & Stationery', slug: 'printing-stationery' },
    { name: 'Design & Creative', slug: 'design-creative' },
    { name: 'Security Services', slug: 'security-services' },
    { name: 'Consulting', slug: 'consulting' },
    { name: 'Other Services', slug: 'other-services' },
  ]},
  { name: 'Repair & Construction', slug: 'repair-construction', children: [
    { name: 'Electrical Equipment', slug: 'electrical-equipment', children: [
      { name: 'Generators', slug: 'generators' },
      { name: 'Solar & Renewable Energy', slug: 'solar-renewable-energy' },
      { name: 'Inverters & Backup Batteries', slug: 'inverters-backup-batteries' },
      { name: 'Switches, Sockets & Distribution', slug: 'switches-sockets-distribution' },
      { name: 'Stabilizers & Voltage Protection', slug: 'stabilizers-voltage-protection' },
      { name: 'Welding Machinery & Construction', slug: 'welding-machinery-construction' },
      { name: 'Industrial Electrical & Automation', slug: 'industrial-electrical-automation' },
      { name: 'Electronic Components & Sensors', slug: 'electronic-components-sensors' },
      { name: 'Cables & Wires', slug: 'cables-wires' },
    ]},
    { name: 'Building Materials & Supplies', slug: 'building-materials-supplies' },
    { name: 'Plumbing & Water Systems', slug: 'plumbing-water-systems' },
    { name: 'Electrical Hand Tools', slug: 'electrical-hand-tools' },
    { name: 'Construction & Heavy Machinery', slug: 'construction-heavy-machinery' },
    { name: 'Paints & Coatings', slug: 'paints-coatings' },
    { name: 'Doors & Windows', slug: 'doors-windows' },
    { name: 'Flooring & Tiles', slug: 'flooring-tiles' },
    { name: 'Roofing & Gutters', slug: 'roofing-gutters' },
    { name: 'Fencing & Gates', slug: 'fencing-gates' },
    { name: 'Bathroom & Sanitary Ware', slug: 'bathroom-sanitary-ware' },
    { name: 'Security & Alarm Systems', slug: 'security-alarm-systems' },
    { name: 'Other Repair & Construction', slug: 'other-repair-construction' },
  ]},
  { name: 'Commercial Equipment & Tools', slug: 'commercial-equipment-tools', children: [
    { name: 'Medical Equipment & Supplies', slug: 'medical-equipment-supplies' },
    { name: 'Safety Equipment & Protective Gear', slug: 'safety-equipment-protective-gear' },
    { name: 'Manufacturing Equipment', slug: 'manufacturing-equipment' },
    { name: 'Manufacturing Materials & Supplies', slug: 'manufacturing-materials-supplies' },
    { name: 'Office Furniture & Equipment', slug: 'office-furniture-equipment' },
    { name: 'Restaurant & Catering Equipment', slug: 'restaurant-catering-equipment' },
    { name: 'Retail & Shop Equipment', slug: 'retail-shop-equipment' },
    { name: 'Agriculture & Farm Equipment', slug: 'agriculture-farm-equipment' },
    { name: 'Printing & Packaging Equipment', slug: 'printing-packaging-equipment' },
    { name: 'Laboratory Equipment', slug: 'laboratory-equipment' },
    { name: 'Other Commercial Equipment', slug: 'other-commercial-equipment' },
  ]},
  { name: 'Leisure & Activities', slug: 'leisure-activities', children: [
    { name: 'Sports Equipment & Gear', slug: 'sports-equipment-gear' },
    { name: 'Bicycles & Cycling', slug: 'bicycles-cycling' },
    { name: 'Musical Instruments & Gear', slug: 'musical-instruments-gear' },
    { name: 'Personal Mobility', slug: 'personal-mobility' },
    { name: 'Massagers & Relaxation', slug: 'massagers-relaxation' },
    { name: 'Camping & Hiking', slug: 'camping-hiking' },
    { name: 'Fitness & Exercise Equipment', slug: 'fitness-exercise-equipment' },
    { name: 'Books & Magazines', slug: 'books-magazines' },
    { name: 'Art & Collectibles', slug: 'art-collectibles' },
    { name: 'Other Leisure & Activities', slug: 'other-leisure-activities' },
  ]},
  { name: 'Babies & Kids', slug: 'babies-kids', children: [
    { name: 'Toys & Games', slug: 'toys-games' },
    { name: "Children's Furniture", slug: 'childrens-furniture' },
    { name: "Children's Clothing", slug: 'childrens-clothing' },
    { name: "Children's Shoes", slug: 'childrens-shoes' },
    { name: 'Baby Gear & Accessories', slug: 'baby-gear-accessories' },
    { name: 'Diapers & Baby Care', slug: 'diapers-baby-care' },
    { name: 'Feeding & Nursing', slug: 'feeding-nursing' },
    { name: 'Strollers & Car Seats', slug: 'strollers-car-seats' },
    { name: 'Nursery Furniture & Decor', slug: 'nursery-furniture-decor' },
    { name: 'Educational Toys & Books', slug: 'educational-toys-books' },
    { name: 'Other Babies & Kids', slug: 'other-babies-kids' },
  ]},
  { name: 'Food, Agriculture & Farming', slug: 'food-agriculture-farming', children: [
    { name: 'Food & Beverages', slug: 'food-beverages' },
    { name: 'Farm Animals & Livestock', slug: 'farm-animals-livestock' },
    { name: 'Seeds, Fertilizers & Feeds', slug: 'seeds-fertilizers-feeds' },
    { name: 'Farm Machinery & Equipment', slug: 'farm-machinery-equipment' },
    { name: 'Fresh Produce & Groceries', slug: 'fresh-produce-groceries' },
  ]},
  { name: 'Animals & Pets', slug: 'animals-pets', children: [
    { name: 'Dogs & Puppies', slug: 'dogs-puppies' },
    { name: 'Cats & Kittens', slug: 'cats-kittens' },
    { name: 'Fish & Aquariums', slug: 'fish-aquariums' },
    { name: 'Birds', slug: 'birds' },
    { name: 'Pet Accessories & Supplies', slug: 'pet-accessories-supplies' },
    { name: 'Pet Food & Treats', slug: 'pet-food-treats' },
    { name: 'Other Pets', slug: 'other-pets' },
  ]},
  { name: 'Jobs', slug: 'jobs', children: [
    { name: 'Accounting & Finance Jobs', slug: 'accounting-finance-jobs' },
    { name: 'Advertising & Marketing Jobs', slug: 'advertising-marketing-jobs' },
    { name: 'Arts & Entertainment Jobs', slug: 'arts-entertainment-jobs' },
    { name: 'Childcare & Babysitting Jobs', slug: 'childcare-babysitting-jobs' },
    { name: 'Cleaning & Domestic Jobs', slug: 'cleaning-domestic-jobs' },
    { name: 'Construction & Trades Jobs', slug: 'construction-trades-jobs' },
    { name: 'Customer Service Jobs', slug: 'customer-service-jobs' },
    { name: 'Education & Training Jobs', slug: 'education-training-jobs' },
    { name: 'Engineering & Technical Jobs', slug: 'engineering-technical-jobs' },
    { name: 'Food Service & Hospitality Jobs', slug: 'food-service-hospitality-jobs' },
    { name: 'Healthcare & Nursing Jobs', slug: 'healthcare-nursing-jobs' },
    { name: 'HR & Recruitment Jobs', slug: 'hr-recruitment-jobs' },
    { name: 'IT & Software Development Jobs', slug: 'it-software-development-jobs' },
    { name: 'Legal Jobs', slug: 'legal-jobs' },
    { name: 'Logistics & Transportation Jobs', slug: 'logistics-transportation-jobs' },
    { name: 'Manufacturing & Production Jobs', slug: 'manufacturing-production-jobs' },
    { name: 'Marketing & PR Jobs', slug: 'marketing-pr-jobs' },
    { name: 'Media & Journalism Jobs', slug: 'media-journalism-jobs' },
    { name: 'NGO & Social Work Jobs', slug: 'ngo-social-work-jobs' },
    { name: 'Office & Admin Jobs', slug: 'office-admin-jobs' },
    { name: 'Real Estate & Property Jobs', slug: 'real-estate-property-jobs' },
    { name: 'Retail & Sales Jobs', slug: 'retail-sales-jobs' },
    { name: 'Security & Military Jobs', slug: 'security-military-jobs' },
    { name: 'Telecommunications Jobs', slug: 'telecommunications-jobs' },
    { name: 'Training & Internship', slug: 'training-internship' },
    { name: 'Transport & Driving Jobs', slug: 'transport-driving-jobs' },
    { name: 'Travel & Tourism Jobs', slug: 'travel-tourism-jobs' },
    { name: 'Other Jobs', slug: 'other-jobs' },
    { name: 'Seeking Work - CVs', slug: 'seeking-work-cvs', children: [
      { name: 'Accounting & Finance CVs', slug: 'accounting-finance-cvs' },
      { name: 'Advertising & Marketing CVs', slug: 'advertising-marketing-cvs' },
      { name: 'Arts & Entertainment CVs', slug: 'arts-entertainment-cvs' },
      { name: 'Childcare & Babysitting CVs', slug: 'childcare-babysitting-cvs' },
      { name: 'Cleaning & Domestic CVs', slug: 'cleaning-domestic-cvs' },
      { name: 'Construction & Trades CVs', slug: 'construction-trades-cvs' },
      { name: 'Customer Service CVs', slug: 'customer-service-cvs' },
      { name: 'Education & Training CVs', slug: 'education-training-cvs' },
      { name: 'Engineering & Technical CVs', slug: 'engineering-technical-cvs' },
      { name: 'Food Service & Hospitality CVs', slug: 'food-service-hospitality-cvs' },
      { name: 'Healthcare & Nursing CVs', slug: 'healthcare-nursing-cvs' },
      { name: 'HR & Recruitment CVs', slug: 'hr-recruitment-cvs' },
      { name: 'IT & Software Development CVs', slug: 'it-software-development-cvs' },
      { name: 'Legal CVs', slug: 'legal-cvs' },
      { name: 'Logistics & Transportation CVs', slug: 'logistics-transportation-cvs' },
      { name: 'Manufacturing & Production CVs', slug: 'manufacturing-production-cvs' },
      { name: 'Marketing & PR CVs', slug: 'marketing-pr-cvs' },
      { name: 'Media & Journalism CVs', slug: 'media-journalism-cvs' },
      { name: 'NGO & Social Work CVs', slug: 'ngo-social-work-cvs' },
      { name: 'Office & Admin CVs', slug: 'office-admin-cvs' },
      { name: 'Real Estate & Property CVs', slug: 'real-estate-property-cvs' },
      { name: 'Retail & Sales CVs', slug: 'retail-sales-cvs' },
      { name: 'Security & Military CVs', slug: 'security-military-cvs' },
      { name: 'Telecommunications CVs', slug: 'telecommunications-cvs' },
      { name: 'Training & Internship CVs', slug: 'training-internship-cvs' },
      { name: 'Transport & Driving CVs', slug: 'transport-driving-cvs' },
      { name: 'Travel & Tourism CVs', slug: 'travel-tourism-cvs' },
      { name: 'Other CVs', slug: 'other-cvs' },
    ]},
  ]},
];

export const categoriesRouter = Router();
categoriesRouter.use(requireStore);

export async function seedStoreCategories(storeId: string): Promise<number> {
  const existing = await prisma.category.count({ where: { storeId } });
  if (existing > 0) return 0;
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
  await createTree(jijiCategories, null);
  logger.info(`Auto-seeded ${created} categories for store ${storeId}`);
  return created;
}

categoriesRouter.post('/', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { name, slug, description, image, parentId } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, error: 'name and slug are required' });
    const category = await prisma.category.create({ data: { name, slug, description: description || '', image: image || '', parentId: parentId || null, storeId: req.storeId! } });
    res.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
});

categoriesRouter.put('/:id', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { name, slug, description, image, parentId } = req.body;
    const category = await prisma.category.update({ where: { id: req.params.id }, data: { name, slug, description, image, parentId } });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});

categoriesRouter.delete('/:id', authenticate, async (req: StoreRequest, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) { next(error); }
});

categoriesRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    const storeId = req.storeId!;
    const forceReseed = req.query.force === '1';
    if (forceReseed) {
      await prisma.category.deleteMany({ where: { storeId } });
    }
    let categories = await prisma.category.findMany({ where: { storeId }, orderBy: { name: 'asc' } });
    if (categories.length === 0) {
      const seeded = await seedStoreCategories(storeId);
      if (seeded > 0) categories = await prisma.category.findMany({ where: { storeId }, orderBy: { name: 'asc' } });
    }
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

categoriesRouter.get('/:slug', async (req: StoreRequest, res, next) => {
  try {
    const category = await prisma.category.findFirst({
      where: { slug: req.params.slug, storeId: req.storeId! },
      include: { children: true, parent: true },
    });
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});
