export interface AttributeOption {
  label: string; value: string;
}
export interface AttributeDef {
  key: string; label: string;
  type: 'select' | 'multiselect' | 'text' | 'boolean' | 'number';
  options?: AttributeOption[]; placeholder?: string; unit?: string;
}

const attr = (key: string, label: string, type: AttributeDef['type'], opts?: { options?: AttributeOption[]; placeholder?: string; unit?: string }): AttributeDef =>
  ({ key, label, type, ...opts });

const brandOpts = (brands: string[]) => brands.map(b => ({ label: b, value: b.toLowerCase().replace(/\s+/g, '-') }));
const commonBrands = brandOpts(['Samsung', 'Apple', 'Tecno', 'Infinix', 'Nokia', 'Huawei', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'OnePlus', 'Google', 'Sony', 'LG', 'Motorola', 'Other']);
const laptopBrands = brandOpts(['Dell', 'HP', 'Lenovo', 'Apple', 'Acer', 'Asus', 'Toshiba', 'Sony', 'Samsung', 'Microsoft', 'Other']);
const conditionOpts = brandOpts(['Brand New', 'Refurbished', 'Used']);
const storageOpts = (sizes: string[]) => sizes.map(s => ({ label: s, value: s.replace(/\s+/g, '-').toLowerCase() }));
const yesNo = [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }];

const clothingGender = brandOpts(['Men', 'Women', 'Unisex', 'Boys', 'Girls']);
const clothingSize = brandOpts(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL']);
const shoeSize = brandOpts(['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47']);

export const categoryAttributes: Record<string, AttributeDef[]> = {
  'mobile-phones': [
    attr('brand', 'Brand', 'select', { options: commonBrands }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
    attr('storage', 'Storage', 'select', { options: storageOpts(['4 GB', '8 GB', '16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB']) }),
    attr('ram', 'RAM', 'select', { options: storageOpts(['1 GB', '2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB', '24 GB']) }),
    attr('color', 'Color', 'select', { options: brandOpts(['Black', 'White', 'Silver', 'Gray', 'Gold', 'Blue', 'Red', 'Green', 'Pink', 'Purple', 'Other']) }),
    attr('display_type', 'Display Type', 'select', { options: brandOpts(['AMOLED', 'OLED', 'IPS LCD', 'Super AMOLED', 'Retina', 'LCD', 'Other']) }),
    attr('display_size', 'Display Size', 'select', { options: brandOpts(['< 5"', '5.1 - 5.5"', '5.6 - 6"', '6.1 - 6.5"', '6.6 - 6.8"', '> 6.8"']) }),
    attr('sim_type', 'SIM Type', 'select', { options: brandOpts(['Dual SIM', 'Single SIM', 'eSIM', 'Dual Nano-SIM', 'Nano-SIM + eSIM']) }),
    attr('battery', 'Battery', 'select', { options: brandOpts(['3000 mAh', '4000 mAh', '5000 mAh', '6000 mAh', '7000 mAh+']) }),
    attr('nfc', 'NFC', 'boolean'),
    attr('waterproof', 'Water Resistant', 'boolean'),
    attr('5g', '5G Ready', 'boolean'),
  ],
  tablets: [
    attr('brand', 'Brand', 'select', { options: commonBrands }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
    attr('storage', 'Storage', 'select', { options: storageOpts(['16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB']) }),
    attr('ram', 'RAM', 'select', { options: storageOpts(['2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB']) }),
    attr('display_size', 'Screen Size', 'select', { options: brandOpts(['7"', '8"', '10"', '11"', '12.9"', '14"']) }),
    attr('cellular', 'Cellular', 'boolean'),
  ],
  'smart-watches': [
    attr('brand', 'Brand', 'select', { options: commonBrands }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
    attr('connectivity', 'Connectivity', 'select', { options: brandOpts(['Bluetooth', 'Bluetooth + WiFi', 'Bluetooth + WiFi + Cellular']) }),
  ],
  'phone-tablet-accessories': [
    attr('type', 'Accessory Type', 'select', { options: brandOpts(['Charger', 'Case', 'Screen Protector', 'Cable', 'Power Bank', 'Headphones', 'Stand', 'Other']) }),
  ],
  'laptops-computers': [
    attr('brand', 'Brand', 'select', { options: laptopBrands }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
    attr('processor', 'Processor', 'select', { options: brandOpts(['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Apple M1', 'Apple M2', 'Apple M3', 'Other']) }),
    attr('ram', 'RAM', 'select', { options: storageOpts(['4 GB', '8 GB', '16 GB', '32 GB', '64 GB', '128 GB']) }),
    attr('storage', 'Storage', 'select', { options: storageOpts(['128 GB', '256 GB', '512 GB', '1 TB', '2 TB']) }),
    attr('screen_size', 'Screen Size', 'select', { options: brandOpts(['11" - 12"', '13" - 14"', '15" - 16"', '17"+']) }),
  ],
  'computer-accessories': [
    attr('type', 'Accessory Type', 'select', { options: brandOpts(['Mouse', 'Keyboard', 'Monitor', 'Webcam', 'Headset', 'Hub', 'Cable', 'Other']) }),
  ],
  'tv-video-equipment': [
    attr('brand', 'Brand', 'select', { options: brandOpts(['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Panasonic', 'Other']) }),
    attr('screen_size', 'Screen Size', 'select', { options: brandOpts(['24"', '32"', '40"', '43"', '50"', '55"', '65"', '75"+']) }),
    attr('resolution', 'Resolution', 'select', { options: brandOpts(['HD Ready', 'Full HD', '4K', '8K']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'video-game-consoles': [
    attr('brand', 'Brand', 'select', { options: brandOpts(['Sony PlayStation', 'Microsoft Xbox', 'Nintendo', 'Other']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  cars: [
    attr('make', 'Make', 'select', { options: brandOpts(['Toyota', 'Nissan', 'Honda', 'Mercedes-Benz', 'BMW', 'Volkswagen', 'Ford', 'Mitsubishi', 'Subaru', 'Mazda', 'Suzuki', 'Lexus', 'Audi', 'Hyundai', 'Kia', 'Jeep', 'Land Rover', 'Other']) }),
    attr('year', 'Year', 'select', { options: Array.from({ length: 30 }, (_, i) => ({ label: `${2026 - i}`, value: `${2026 - i}` })) }),
    attr('mileage', 'Mileage (km)', 'number', { placeholder: 'e.g. 50000', unit: 'km' }),
    attr('fuel_type', 'Fuel Type', 'select', { options: brandOpts(['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG']) }),
    attr('transmission', 'Transmission', 'select', { options: brandOpts(['Automatic', 'Manual', 'Tiptronic', 'CVT']) }),
    attr('condition', 'Condition', 'select', { options: brandOpts(['Foreign Used', 'Local Used', 'Brand New']) }),
    attr('body_type', 'Body Type', 'select', { options: brandOpts(['Sedan', 'SUV', 'Hatchback', 'Station Wagon', 'Pickup', 'Van', 'Coupe', 'Convertible']) }),
  ],
  'motorcycles-scooters': [
    attr('make', 'Make', 'select', { options: brandOpts(['Bajaj', 'TVS', 'Honda', 'Yamaha', 'Suzuki', 'Boxer', 'Hero', 'Kawasaki', 'Other']) }),
    attr('year', 'Year', 'select', { options: Array.from({ length: 20 }, (_, i) => ({ label: `${2026 - i}`, value: `${2026 - i}` })) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'vehicle-parts-accessories': [
    attr('type', 'Part Type', 'select', { options: brandOpts(['Engine Parts', 'Brakes', 'Suspension', 'Tyres & Rims', 'Body Parts', 'Electrical', 'Interior', 'Tools', 'Other']) }),
    attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }),
  ],
  'houses-apartments-sale': [
    attr('bedrooms', 'Bedrooms', 'select', { options: brandOpts(['1', '2', '3', '4', '5+']) }),
    attr('bathrooms', 'Bathrooms', 'select', { options: brandOpts(['1', '2', '3', '4+']) }),
    attr('size', 'Size (sqm)', 'number', { placeholder: 'e.g. 100', unit: 'sqm' }),
    attr('furnished', 'Furnished', 'boolean'),
  ],
  'houses-apartments-rent': [
    attr('bedrooms', 'Bedrooms', 'select', { options: brandOpts(['1', '2', '3', '4', '5+']) }),
    attr('bathrooms', 'Bathrooms', 'select', { options: brandOpts(['1', '2', '3', '4+']) }),
    attr('size', 'Size (sqm)', 'number', { placeholder: 'e.g. 80', unit: 'sqm' }),
    attr('furnished', 'Furnished', 'boolean'),
  ],
  'land-plots': [
    attr('size', 'Size (sqm)', 'number', { placeholder: 'e.g. 500', unit: 'sqm' }),
    attr('zoning', 'Zoning', 'select', { options: brandOpts(['Residential', 'Commercial', 'Agricultural', 'Industrial', 'Mixed Use']) }),
  ],
  'short-let-vacation-rentals': [
    attr('bedrooms', 'Bedrooms', 'select', { options: brandOpts(['Studio', '1', '2', '3', '4+']) }),
    attr('max_guests', 'Max Guests', 'number', { placeholder: 'e.g. 4' }),
  ],
  'womens-clothing': [
    attr('gender', 'Gender', 'select', { options: brandOpts(['Women', 'Girls']) }),
    attr('size', 'Size', 'multiselect', { options: clothingSize }),
    attr('material', 'Material', 'select', { options: brandOpts(['Cotton', 'Polyester', 'Silk', 'Linen', 'Wool', 'Denim', 'Leather', 'Nylon', 'Other']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'mens-clothing': [
    attr('gender', 'Gender', 'select', { options: brandOpts(['Men', 'Boys']) }),
    attr('size', 'Size', 'multiselect', { options: clothingSize }),
    attr('material', 'Material', 'select', { options: brandOpts(['Cotton', 'Polyester', 'Silk', 'Linen', 'Wool', 'Denim', 'Leather', 'Nylon', 'Other']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'womens-shoes': [
    attr('gender', 'Gender', 'select', { options: brandOpts(['Women', 'Girls']) }),
    attr('size', 'Size', 'multiselect', { options: shoeSize }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'mens-shoes': [
    attr('gender', 'Gender', 'select', { options: brandOpts(['Men', 'Boys']) }),
    attr('size', 'Size', 'multiselect', { options: shoeSize }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'womens-bags': [
    attr('type', 'Bag Type', 'select', { options: brandOpts(['Handbag', 'Shoulder Bag', 'Tote', 'Clutch', 'Backpack', 'Crossbody', 'Wallet', 'Other']) }),
    attr('material', 'Material', 'select', { options: brandOpts(['Leather', 'Fabric', 'Synthetic', 'Straw', 'Other']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'mens-bags': [
    attr('type', 'Bag Type', 'select', { options: brandOpts(['Backpack', 'Messenger', 'Briefcase', 'Wallet', 'Duffel', 'Crossbody', 'Other']) }),
    attr('material', 'Material', 'select', { options: brandOpts(['Leather', 'Fabric', 'Synthetic', 'Other']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'womens-jewelry': [
    attr('type', 'Type', 'select', { options: brandOpts(['Necklace', 'Earrings', 'Bracelet', 'Ring', 'Anklet', 'Set', 'Other']) }),
    attr('material', 'Material', 'select', { options: brandOpts(['Gold', 'Silver', 'Stainless Steel', 'Beaded', 'Fabric', 'Other']) }),
  ],
  'mens-jewelry': [
    attr('type', 'Type', 'select', { options: brandOpts(['Necklace', 'Bracelet', 'Ring', 'Chain', 'Other']) }),
    attr('material', 'Material', 'select', { options: brandOpts(['Gold', 'Silver', 'Stainless Steel', 'Leather', 'Other']) }),
  ],
  'womens-watches': [
    attr('brand', 'Brand', 'text', { placeholder: 'e.g. Rolex, Fossil' }),
    attr('gender', 'Gender', 'select', { options: brandOpts(['Women']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'mens-watches': [
    attr('brand', 'Brand', 'text', { placeholder: 'e.g. Rolex, Fossil' }),
    attr('gender', 'Gender', 'select', { options: brandOpts(['Men']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'childrens-clothing': [
    attr('gender', 'Gender', 'select', { options: brandOpts(['Boys', 'Girls', 'Unisex']) }),
    attr('size', 'Size', 'multiselect', { options: brandOpts(['0-3M', '3-6M', '6-12M', '12-24M', '2T', '3T', '4T', '5', '6', '7', '8', '10', '12', '14']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'hair-beauty': [
    attr('type', 'Product Type', 'select', { options: brandOpts(['Shampoo', 'Conditioner', 'Styling', 'Treatment', 'Tools', 'Extensions', 'Other']) }),
    attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }),
  ],
  'face-care-skin-care': [
    attr('type', 'Product Type', 'select', { options: brandOpts(['Moisturizer', 'Serum', 'Cleanser', 'Toner', 'Sunscreen', 'Mask', 'Eye Care', 'Other']) }),
    attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }),
    attr('skin_type', 'Skin Type', 'select', { options: brandOpts(['All', 'Dry', 'Oily', 'Combination', 'Sensitive', 'Normal']) }),
  ],
  'makeup-cosmetics': [
    attr('type', 'Product Type', 'select', { options: brandOpts(['Foundation', 'Lipstick', 'Eyeshadow', 'Mascara', 'Blush', 'Concealer', 'Setting Spray', 'Palette', 'Other']) }),
    attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }),
  ],
  'fragrance-deodorants': [
    attr('type', 'Type', 'select', { options: brandOpts(['Perfume', 'Cologne', 'Body Spray', 'Deodorant', 'Roll-on', 'Oil']) }),
    attr('gender', 'Gender', 'select', { options: clothingGender }),
  ],
  'vitamins-supplements': [
    attr('type', 'Type', 'select', { options: brandOpts(['Multivitamin', 'Protein', 'Omega 3', 'Vitamin D', 'Vitamin C', 'Iron', 'Calcium', 'Probiotic', 'Other']) }),
    attr('form', 'Form', 'select', { options: brandOpts(['Tablet', 'Capsule', 'Powder', 'Liquid', 'Gummy', 'Injection']) }),
  ],
  'medical-equipment-devices': [
    attr('type', 'Device Type', 'select', { options: brandOpts(['Blood Pressure Monitor', 'Thermometer', 'Glucose Meter', 'Pulse Oximeter', 'Nebulizer', 'Stethoscope', 'Other']) }),
    attr('condition', 'Condition', 'select', { options: conditionOpts }),
  ],
  'sexual-wellness': [
    attr('type', 'Product Type', 'select', { options: brandOpts(['Supplements', 'Creams', 'Oils', 'Devices', 'Lubricants', 'Other']) }),
  ],
  'fitness-nutrition': [
    attr('type', 'Type', 'select', { options: brandOpts(['Protein Powder', 'Weight Gainer', 'Pre-Workout', 'BCAA', 'Meal Replacement', 'Snacks', 'Other']) }),
    attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }),
  ],
  'food-beverages': [
    attr('type', 'Type', 'select', { options: brandOpts(['Beverages', 'Snacks', 'Grains', 'Spices', 'Oils', 'Sauces', 'Canned', 'Other']) }),
  ],
  'dogs-puppies': [
    attr('breed', 'Breed', 'text', { placeholder: 'e.g. German Shepherd' }),
    attr('age', 'Age', 'select', { options: brandOpts(['Puppy', 'Young', 'Adult', 'Senior']) }),
    attr('gender', 'Gender', 'select', { options: brandOpts(['Male', 'Female']) }),
  ],
  'cats-kittens': [
    attr('breed', 'Breed', 'text', { placeholder: 'e.g. Persian' }),
    attr('age', 'Age', 'select', { options: brandOpts(['Kitten', 'Young', 'Adult', 'Senior']) }),
    attr('gender', 'Gender', 'select', { options: brandOpts(['Male', 'Female']) }),
  ],
  services: [
    attr('type', 'Service Type', 'select', { options: brandOpts(['Home Service', 'Online Service', 'At Location', 'Other']) }),
    attr('duration', 'Duration', 'select', { options: brandOpts(['One Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Project Based']) }),
  ],
  'accounting-finance-jobs': [attr('employment_type', 'Employment Type', 'select', { options: brandOpts(['Full Time', 'Part Time', 'Contract', 'Internship', 'Remote'])}), attr('experience', 'Experience', 'select', { options: brandOpts(['Entry Level', 'Mid Level', 'Senior', 'Manager', 'Executive'])})],
  'it-software-development-jobs': [attr('employment_type', 'Employment Type', 'select', { options: brandOpts(['Full Time', 'Part Time', 'Contract', 'Internship', 'Remote'])}), attr('experience', 'Experience', 'select', { options: brandOpts(['Entry Level', 'Mid Level', 'Senior', 'Manager', 'Executive'])})],
};

export function getAttributesForCategory(slug: string): AttributeDef[] {
  return categoryAttributes[slug] || [];
}
