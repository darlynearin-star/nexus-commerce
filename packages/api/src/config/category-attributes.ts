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
  // Vehicles - remaining
  'buses-microbuses': [attr('make', 'Make', 'select', { options: brandOpts(['Toyota', 'Nissan', 'Isuzu', 'Mitsubishi', 'Hino', 'Mercedes-Benz', 'Scania', 'Volvo', 'Other']) }), attr('seating', 'Seating Capacity', 'select', { options: brandOpts(['12-20', '21-30', '31-45', '46-60', '60+']) }), attr('condition', 'Condition', 'select', { options: brandOpts(['Foreign Used', 'Local Used', 'Brand New']) })],
  'trucks-trailers': [attr('make', 'Make', 'select', { options: brandOpts(['Toyota', 'Nissan', 'Isuzu', 'Mitsubishi', 'Hino', 'Mercedes-Benz', 'MAN', 'Scania', 'Volvo', 'Fuso', 'Other']) }), attr('load_capacity', 'Load Capacity (tons)', 'select', { options: brandOpts(['1-3', '3-7', '7-15', '15-30', '30+']) }), attr('condition', 'Condition', 'select', { options: brandOpts(['Foreign Used', 'Local Used', 'Brand New']) })],
  'boats-watercraft': [attr('type', 'Boat Type', 'select', { options: brandOpts(['Motor Boat', 'Sailboat', 'Yacht', 'Fishing Boat', 'Canoe', 'Kayak', 'Speedboat', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts }), attr('length', 'Length (ft)', 'select', { options: brandOpts(['< 15', '15-25', '25-40', '40-60', '60+']) })],
  'heavy-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Excavator', 'Bulldozer', 'Crane', 'Forklift', 'Loader', 'Dump Truck', 'Roller', 'Tractor', 'Generator', 'Compressor', 'Other']) }), attr('condition', 'Condition', 'select', { options: brandOpts(['Foreign Used', 'Local Used', 'Brand New']) }), attr('year', 'Year', 'select', { options: Array.from({ length: 25 }, (_, i) => ({ label: `${2026 - i}`, value: `${2026 - i}` })) })],
  'car-audio-electronics': [attr('type', 'Product Type', 'select', { options: brandOpts(['Car Stereo', 'Speaker', 'Subwoofer', 'Amplifier', 'GPS Tracker', 'Dash Cam', 'Car Alarm', 'LED Lights', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'e.g. Pioneer, Sony' })],
  'other-vehicles': [attr('type', 'Vehicle Type', 'text', { placeholder: 'e.g. Trailer, Golf cart' }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  // Property - remaining
  'commercial-property-sale': [attr('property_type', 'Property Type', 'select', { options: brandOpts(['Office Space', 'Shop', 'Warehouse', 'Factory', 'Land', 'Hotel/Lodge', 'Other']) }), attr('size', 'Size (sqm)', 'number', { placeholder: 'e.g. 500', unit: 'sqm' })],
  'commercial-property-rent': [attr('property_type', 'Property Type', 'select', { options: brandOpts(['Office Space', 'Shop', 'Warehouse', 'Factory', 'Land', 'Hotel/Lodge', 'Other']) }), attr('size', 'Size (sqm)', 'number', { placeholder: 'e.g. 200', unit: 'sqm' }), attr('furnished', 'Furnished', 'boolean')],
  'new-builds': [attr('property_type', 'Property Type', 'select', { options: brandOpts(['House', 'Apartment', 'Commercial', 'Mixed Use']) }), attr('bedrooms', 'Bedrooms', 'select', { options: brandOpts(['1', '2', '3', '4', '5+']) }), attr('completion', 'Completion Status', 'select', { options: brandOpts(['Completed', 'Near Completion', 'Under Construction', 'Foundation']) })],
  'rooms-rent-shared': [attr('type', 'Room Type', 'select', { options: brandOpts(['Single Room', 'Bedsitter', 'Shared Room', 'Studio']) }), attr('furnished', 'Furnished', 'boolean')],
  'parking-storage': [attr('type', 'Space Type', 'select', { options: brandOpts(['Parking Slot', 'Garage', 'Storage Unit', 'Warehouse Space']) }), attr('security', 'Security', 'boolean')],
  // Phones remaining
  'phone-parts-repair-tools': [attr('part_type', 'Part Type', 'select', { options: brandOpts(['Screen', 'Battery', 'Charging Port', 'Camera', 'Speaker', 'Motherboard', 'Housing', 'Repair Tool', 'Other']) }), attr('compatible_brand', 'Compatible Brand', 'select', { options: commonBrands })],
  // Electronics remaining
  'audio-music-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Studio Monitor', 'Mixer', 'Microphone', 'PA System', 'DJ Controller', 'Turntable', 'Amplifier', 'Guitar Amp', 'Karaoke', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'cameras-photography': [attr('type', 'Camera Type', 'select', { options: brandOpts(['DSLR', 'Mirrorless', 'Point & Shoot', 'Film Camera', 'Action Cam', 'CCTV', 'Lens', 'Drone', 'Other']) }), attr('brand', 'Brand', 'select', { options: brandOpts(['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic', 'GoPro', 'DJI', 'Olympus', 'Other']) }), attr('megapixels', 'Megapixels', 'select', { options: brandOpts(['Under 12MP', '12-16MP', '16-24MP', '24-36MP', '36MP+']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'printers-scanners': [attr('type', 'Device Type', 'select', { options: brandOpts(['Printer', 'Scanner', 'All-in-One', '3D Printer', 'Large Format']) }), attr('brand', 'Brand', 'text', { placeholder: 'e.g. HP, Canon' }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'networking-modems': [attr('type', 'Device Type', 'select', { options: brandOpts(['Router', 'Modem', 'Switch', 'Access Point', 'Extender', 'Cable', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'e.g. TP-Link, Cisco' })],
  'monitors-displays': [attr('screen_size', 'Screen Size', 'select', { options: brandOpts(['19"-22"', '24"-27"', '28"-32"', '34"+', 'Portable']) }), attr('resolution', 'Resolution', 'select', { options: brandOpts(['HD', 'Full HD', '2K', '4K', '5K+']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'computer-components': [attr('type', 'Component Type', 'select', { options: brandOpts(['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage Drive', 'PSU', 'Cooling Fan', 'Case', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'home-audio-speakers': [attr('type', 'Speaker Type', 'select', { options: brandOpts(['Bookshelf', 'Floor Standing', 'Soundbar', 'Subwoofer', 'Portable', 'Smart Speaker', 'Home Theater', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'car-electronics': [attr('type', 'Device Type', 'select', { options: brandOpts(['GPS/Navigation', 'Dash Cam', 'Radar Detector', 'Car Alarm', 'Car Charger', 'FM Transmitter', 'OBD Scanner', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'security-surveillance': [attr('type', 'Device Type', 'select', { options: brandOpts(['CCTV Camera', 'IP Camera', 'DVR/NVR', 'Doorbell Camera', 'Motion Sensor', 'Alarm System', 'Smart Lock', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }), attr('resolution', 'Resolution', 'select', { options: brandOpts(['HD', 'Full HD', '2K', '4K']) })],
  'smart-home-devices': [attr('type', 'Device Type', 'select', { options: brandOpts(['Smart Light', 'Smart Plug', 'Smart Thermostat', 'Smart Lock', 'Smart Speaker', 'Smart Sensor', 'Hub', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'other-electronics': [attr('type', 'Type', 'text', { placeholder: 'e.g. Electronic component, accessory' }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  // Home, Furniture & Appliances
  furniture: [attr('type', 'Furniture Type', 'select', { options: brandOpts(['Sofa/Couch', 'Bed', 'Table', 'Chair', 'Wardrobe', 'Bookshelf', 'Desk', 'Dresser', 'Cabinet', 'Mattress', 'Outdoor', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Wood', 'Metal', 'Leather', 'Fabric', 'Glass', 'Plastic', 'Rattan', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  lighting: [attr('type', 'Lighting Type', 'select', { options: brandOpts(['Ceiling Light', 'Floor Lamp', 'Table Lamp', 'Wall Light', 'Chandelier', 'Outdoor Light', 'LED Strip', 'Bulb', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'storage-organization': [attr('type', 'Type', 'select', { options: brandOpts(['Shelf', 'Cabinet', 'Drawer Organizer', 'Storage Box', 'Closet Organizer', 'Shoe Rack', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Wood', 'Plastic', 'Metal', 'Fabric', 'Other']) })],
  'home-accessories-decor': [attr('type', 'Type', 'select', { options: brandOpts(['Wall Art', 'Cushion', 'Rug', 'Curtain', 'Vase', 'Candle', 'Mirror', 'Clock', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Fabric', 'Wood', 'Glass', 'Ceramic', 'Metal', 'Other']) })],
  'kitchen-dining': [attr('type', 'Type', 'select', { options: brandOpts(['Cookware', 'Cutlery', 'Dinnerware', 'Glassware', 'Bakeware', 'Utensils', 'Food Storage', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Stainless Steel', 'Non-Stick', 'Ceramic', 'Glass', 'Cast Iron', 'Plastic', 'Wood', 'Other']) })],
  'bedding-bath': [attr('type', 'Type', 'select', { options: brandOpts(['Bed Sheet', 'Pillow', 'Blanket', 'Duvet', 'Towel', 'Bath Mat', 'Bathrobe', 'Other']) }), attr('size', 'Size', 'select', { options: brandOpts(['Single', 'Double', 'Queen', 'King', 'Super King']) }), attr('material', 'Material', 'select', { options: brandOpts(['Cotton', 'Microfiber', 'Linen', 'Silk', 'Flannel', 'Other']) })],
  'major-appliances': [attr('type', 'Appliance Type', 'select', { options: brandOpts(['Refrigerator', 'Freezer', 'Washing Machine', 'Dryer', 'Dishwasher', 'Oven', 'Cooker', 'Air Conditioner', 'Water Heater', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts }), attr('brand', 'Brand', 'text', { placeholder: 'e.g. Samsung, LG' })],
  'small-kitchen-appliances': [attr('type', 'Appliance Type', 'select', { options: brandOpts(['Blender', 'Kettle', 'Toaster', 'Microwave', 'Coffee Maker', 'Rice Cooker', 'Air Fryer', 'Slow Cooker', 'Mixer', 'Juicer', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'garden-outdoor': [attr('type', 'Type', 'select', { options: brandOpts(['Plants', 'Pots & Planters', 'Garden Tools', 'Outdoor Furniture', 'BBQ & Grills', 'Watering', 'Fencing', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  // Fashion - remaining subcats
  'womens-clothing-accessories': [attr('type', 'Accessory Type', 'select', { options: brandOpts(['Scarf', 'Belt', 'Hat', 'Gloves', 'Sunglasses', 'Hair Accessory', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Fabric', 'Leather', 'Metal', 'Plastic', 'Other']) })],
  'womens-wedding-wear': [attr('type', 'Type', 'select', { options: brandOpts(['Wedding Dress', 'Bridesmaid Dress', 'Veil', 'Tiara', 'Wedding Shoes', 'Accessories', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'mens-clothing-accessories': [attr('type', 'Accessory Type', 'select', { options: brandOpts(['Tie', 'Bow Tie', 'Belt', 'Hat', 'Suspenders', 'Cufflinks', 'Sunglasses', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Silk', 'Leather', 'Cotton', 'Metal', 'Other']) })],
  'mens-wedding-wear': [attr('type', 'Type', 'select', { options: brandOpts(['Suit', 'Tuxedo', 'Traditional Wear', 'Wedding Shoes', 'Accessories', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'childrens-shoes': [attr('gender', 'Gender', 'select', { options: brandOpts(['Boys', 'Girls', 'Unisex']) }), attr('size', 'Size', 'multiselect', { options: brandOpts(['Toddler 4-7', 'Toddler 8-10', 'Junior 11-13', 'Junior 1-3', 'Junior 4-6', 'Youth 7+']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'babies-kids-accessories': [attr('type', 'Accessory Type', 'select', { options: brandOpts(['Hat', 'Socks', 'Mittens', 'Hair Band', 'Sunglasses', 'Backpack', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Cotton', 'Wool', 'Polyester', 'Other']) })],
  // Beauty - remaining
  'oral-care': [attr('type', 'Product Type', 'select', { options: brandOpts(['Toothbrush', 'Toothpaste', 'Mouthwash', 'Floss', 'Whitening Kit', 'Electric Toothbrush', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'body-care-bath': [attr('type', 'Product Type', 'select', { options: brandOpts(['Body Wash', 'Soap', 'Lotion', 'Body Butter', 'Scrub', 'Deodorant', 'Sunscreen', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'nail-care': [attr('type', 'Product Type', 'select', { options: brandOpts(['Nail Polish', 'Nail Tool', 'Nail Art', 'Treatment', 'Remover', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'mens-grooming': [attr('type', 'Product Type', 'select', { options: brandOpts(['Razor', 'Shaving Cream', 'Aftershave', 'Beard Oil', 'Trimmer', 'Wax', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'beauty-tools-accessories': [attr('type', 'Tool Type', 'select', { options: brandOpts(['Hair Dryer', 'Straightener', 'Curler', 'Shaver', 'Epilator', 'Mirror', 'Brush', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'wellness-relaxation': [attr('type', 'Product Type', 'select', { options: brandOpts(['Essential Oil', 'Aromatherapy', 'Massage Oil', 'Candle', 'Bath Salt', 'Relaxation Kit', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'other-beauty-personal-care': [attr('type', 'Type', 'text', { placeholder: 'e.g. Beauty product type' }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  // Medicine & Health - remaining
  'herbal-remedies': [attr('type', 'Product Type', 'select', { options: brandOpts(['Herbal Tea', 'Tincture', 'Capsule', 'Powder', 'Oil Extract', 'Traditional Mix', 'Other']) }), attr('form', 'Form', 'select', { options: brandOpts(['Liquid', 'Capsule', 'Powder', 'Dried Herb', 'Cream']) })],
  'first-aid-emergency': [attr('type', 'Product Type', 'select', { options: brandOpts(['First Aid Kit', 'Bandage', 'Antiseptic', 'Burn Cream', 'Pain Relief', 'Emergency Blanket', 'Other']) })],
  'pharmacy-prescription': [attr('type', 'Product Type', 'select', { options: brandOpts(['Antibiotics', 'Pain Relief', 'Allergy Meds', 'Cold & Flu', 'Digestive Health', 'Other']) }), attr('form', 'Form', 'select', { options: brandOpts(['Tablet', 'Capsule', 'Syrup', 'Cream', 'Injection', 'Drops']) })],
  'eye-care-vision': [attr('type', 'Product Type', 'select', { options: brandOpts(['Glasses', 'Contact Lenses', 'Lens Solution', 'Eye Drops', 'Eye Vitamins', 'Reading Glasses', 'Other']) })],
  'hearing-audiology': [attr('type', 'Product Type', 'select', { options: brandOpts(['Hearing Aid', 'Battery', 'Amplifier', 'Ear Wax Removal', 'Other']) })],
  'orthopedic-mobility-aids': [attr('type', 'Product Type', 'select', { options: brandOpts(['Wheelchair', 'Walker', 'Crutches', 'Cane', 'Scooter', 'Braces', 'Support Pillow', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'maternity-baby-health': [attr('type', 'Product Type', 'select', { options: brandOpts(['Prenatal Vitamins', 'Breast Pump', 'Nursing Pillow', 'Baby Monitor', 'Thermometer', 'Nasal Aspirator', 'Other']) })],
  'other-health-supplies': [attr('type', 'Type', 'text', { placeholder: 'e.g. Health supply type' })],
  // Services sub-categories
  'building-trades-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Construction', 'Plumbing', 'Electrical', 'Masonry', 'Carpentry', 'Painting', 'Welding', 'Tiling', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Hourly', 'Quote Based', 'Negotiable']) })],
  'car-services-automotive': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Mechanic', 'Car Wash', 'Towing', 'Tire Service', 'Auto Electrical', 'AC Service', 'Spray Painting', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Hourly', 'Quote Based', 'Negotiable']) })],
  'computer-it-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Repair', 'Maintenance', 'Networking', 'Data Recovery', 'Installation', 'IT Support', 'Cloud Services', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Hourly', 'Quote Based', 'Negotiable']) })],
  'repair-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Phone Repair', 'Laptop Repair', 'Appliance Repair', 'TV Repair', 'Shoe Repair', 'Jewelry Repair', 'Watch Repair', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Quote Based', 'Negotiable']) })],
  'cleaning-domestic-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Home Cleaning', 'Office Cleaning', 'Carpet Cleaning', 'Window Cleaning', 'Deep Cleaning', 'Laundry', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Hourly', 'Fixed Price', 'Quote Based']) })],
  'health-beauty-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Massage', 'Spa', 'Hair Salon', 'Barber', 'Nail Salon', 'Makeup', 'Facial', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Hourly', 'Quote Based']) })],
  'photography-videography': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Event Photography', 'Portrait', 'Product Photography', 'Wedding Photography', 'Videography', 'Drone Service', 'Photo Editing', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Hourly', 'Per Event', 'Quote Based', 'Negotiable']) })],
  'event-planning-catering': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Event Planning', 'Catering', 'Decoration', 'MC', 'DJ', 'Rentals', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Per Person', 'Quote Based']) })],
  'tutoring-education': [attr('subject', 'Subject', 'text', { placeholder: 'e.g. Math, English' }), attr('level', 'Education Level', 'select', { options: brandOpts(['Primary', 'Secondary', 'High School', 'University', 'Professional', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Hourly', 'Monthly', 'Per Session', 'Negotiable']) })],
  'legal-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Legal Advice', 'Document Preparation', 'Court Representation', 'Notary', 'Mediation', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Hourly', 'Fixed Price', 'Quote Based']) })],
  'financial-accounting-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Accounting', 'Tax Filing', 'Audit', 'Bookkeeping', 'Financial Advisory', 'Insurance', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Hourly', 'Fixed Price', 'Quote Based']) })],
  'marketing-advertising': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Social Media', 'SEO', 'Content Writing', 'Graphic Design', 'Advertising', 'Brand Strategy', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Project Based', 'Monthly Retainer', 'Hourly', 'Quote Based']) })],
  'web-mobile-development': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Web Development', 'Mobile App', 'E-commerce', 'WordPress', 'Custom Software', 'API Integration', 'UI/UX Design', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Project Based', 'Hourly', 'Monthly Retainer', 'Quote Based']) })],
  'writing-translation': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Content Writing', 'Copywriting', 'Translation', 'Proofreading', 'Transcription', 'Ghostwriting', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Per Word', 'Per Page', 'Per Project', 'Hourly']) })],
  'logistics-delivery': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Parcel Delivery', 'Freight', 'Same Day Delivery', 'International Shipping', 'Moving', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Per Km', 'Per Weight', 'Quote Based']) })],
  'moving-relocation': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Local Moving', 'Long Distance', 'Office Relocation', 'Packing Service', 'Storage', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Quote Based', 'Hourly']) })],
  'pet-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Dog Walking', 'Pet Sitting', 'Grooming', 'Pet Training', 'Veterinary', 'Boarding', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Hourly', 'Per Visit', 'Daily', 'Quote Based']) })],
  'travel-tours': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Tour Guide', 'Travel Package', 'Flight Booking', 'Hotel Booking', 'Car Rental', 'Safari', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Per Person', 'Per Group', 'Fixed Price', 'Quote Based']) })],
  'fitness-personal-training': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Personal Training', 'Group Classes', 'Online Coaching', 'Yoga', 'Gym Membership', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Per Session', 'Monthly', 'Package', 'Quote Based']) })],
  'music-entertainment': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['DJ', 'Live Band', 'Singer', 'Instrumentalist', 'Comedian', 'Dancer', 'Sound System', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Per Event', 'Hourly', 'Quote Based']) })],
  'printing-stationery': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Printing', 'Photocopy', 'Binding', 'Stationery Supply', 'Business Cards', 'Banners', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Per Page', 'Per Piece', 'Quote Based']) })],
  'design-creative': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Graphic Design', 'Logo Design', 'Video Editing', 'Animation', 'Interior Design', 'Fashion Design', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Per Project', 'Hourly', 'Quote Based']) })],
  'security-services': [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Guard Services', 'CCTV Installation', 'Alarm Monitoring', 'Security Consulting', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Monthly', 'Per Project', 'Quote Based']) })],
  consulting: [attr('service_type', 'Service Type', 'select', { options: brandOpts(['Business Consulting', 'Management Consulting', 'IT Consulting', 'HR Consulting', 'Strategy', 'Other']) }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Hourly', 'Per Project', 'Monthly Retainer', 'Quote Based']) })],
  'other-services': [attr('service_type', 'Service Type', 'text', { placeholder: 'Type of service' }), attr('pricing', 'Pricing', 'select', { options: brandOpts(['Fixed Price', 'Hourly', 'Quote Based', 'Negotiable']) })],
  // Repair & Construction
  generators: [attr('type', 'Generator Type', 'select', { options: brandOpts(['Petrol', 'Diesel', 'Inverter', 'Solar Generator', 'Gas']) }), attr('power', 'Power Output', 'select', { options: brandOpts(['Under 1 kVA', '1-3 kVA', '3-7 kVA', '7-15 kVA', '15-30 kVA', '30+ kVA']) }), attr('condition', 'Condition', 'select', { options: conditionOpts }), attr('brand', 'Brand', 'text', { placeholder: 'e.g. Honda, Tiger' })],
  'solar-renewable-energy': [attr('type', 'Product Type', 'select', { options: brandOpts(['Solar Panel', 'Inverter', 'Battery', 'Charge Controller', 'Solar Light', 'Complete Kit', 'Other']) }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'inverters-backup-batteries': [attr('type', 'Product Type', 'select', { options: brandOpts(['Inverter', 'Battery', 'UPS', 'Battery Charger', 'Deep Cycle Battery']) }), attr('capacity', 'Capacity', 'text', { placeholder: 'e.g. 200Ah, 3kVA' }), attr('brand', 'Brand', 'text', { placeholder: 'Brand name' })],
  'switches-sockets-distribution': [attr('type', 'Product Type', 'select', { options: brandOpts(['Switch', 'Socket', 'Distribution Board', 'Circuit Breaker', 'Extension Cord', 'Other']) })],
  'stabilizers-voltage-protection': [attr('type', 'Product Type', 'select', { options: brandOpts(['Voltage Stabilizer', 'Surge Protector', 'AVR', 'Voltage Regulator']) }), attr('capacity', 'Capacity', 'text', { placeholder: 'e.g. 1000VA, 5kVA' })],
  'welding-machinery-construction': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Welding Machine', 'Cutting Torch', 'Welding Electrode', 'Safety Gear', 'Welding Accessory']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'industrial-electrical-automation': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Motor', 'Controller', 'Sensor', 'Relay', 'Transformer', 'PLC', 'Other']) })],
  'electronic-components-sensors': [attr('type', 'Component Type', 'select', { options: brandOpts(['Resistor', 'Capacitor', 'Transistor', 'IC', 'Sensor Module', 'Arduino', 'Raspberry Pi', 'Other']) })],
  'cables-wires': [attr('type', 'Cable Type', 'select', { options: brandOpts(['Electrical Cable', 'Network Cable', 'Speaker Wire', 'Coaxial', 'Extension Cable', 'Other']) }), attr('length', 'Length', 'text', { placeholder: 'e.g. 50m, 100m' })],
  'building-materials-supplies': [attr('type', 'Material Type', 'select', { options: brandOpts(['Cement', 'Sand', 'Stone', 'Brick', 'Steel', 'Timber', 'Waterproofing', 'Adhesive', 'Other']) })],
  'plumbing-water-systems': [attr('type', 'Product Type', 'select', { options: brandOpts(['Pipe', 'Fitting', 'Tap', 'Valve', 'Water Tank', 'Pump', 'Water Heater', 'Shower', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['PVC', 'Copper', 'Stainless Steel', 'Brass', 'PEX', 'Other']) })],
  'electrical-hand-tools': [attr('type', 'Tool Type', 'select', { options: brandOpts(['Drill', 'Saw', 'Screwdriver', 'Hammer', 'Multimeter', 'Grinder', 'Sander', 'Tool Set', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts }), attr('power_source', 'Power Source', 'select', { options: brandOpts(['Electric', 'Battery', 'Manual', 'Pneumatic']) })],
  'construction-heavy-machinery': [attr('type', 'Machine Type', 'select', { options: brandOpts(['Excavator', 'Bulldozer', 'Crane', 'Concrete Mixer', 'Compactor', 'Forklift', 'Dump Truck', 'Other']) }), attr('condition', 'Condition', 'select', { options: brandOpts(['Brand New', 'Foreign Used', 'Local Used']) })],
  'paints-coatings': [attr('type', 'Paint Type', 'select', { options: brandOpts(['Emulsion Paint', 'Gloss Paint', 'Primer', 'Varnish', 'Spray Paint', 'Waterproof Paint', 'Other']) }), attr('color', 'Color', 'text', { placeholder: 'e.g. White, Blue' }), attr('finish', 'Finish', 'select', { options: brandOpts(['Matte', 'Gloss', 'Satin', 'Eggshell']) })],
  'doors-windows': [attr('type', 'Type', 'select', { options: brandOpts(['Door', 'Window', 'Door Frame', 'Window Frame', 'Gate', 'Sliding Door', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Wood', 'Metal', 'UPVC', 'Glass', 'Aluminum', 'Other']) })],
  'flooring-tiles': [attr('type', 'Flooring Type', 'select', { options: brandOpts(['Ceramic Tile', 'Porcelain Tile', 'Vinyl', 'Laminate', 'Wood Flooring', 'Stone', 'Other']) }), attr('size', 'Size', 'text', { placeholder: 'e.g. 60x60 cm' })],
  'roofing-gutters': [attr('type', 'Product Type', 'select', { options: brandOpts(['Roofing Sheet', 'Gutter', 'Roofing Accessory', 'Insulation', 'Skylight', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Iron Sheet', 'Tile', 'Polycarbonate', 'Aluminum', 'Other']) })],
  'fencing-gates': [attr('type', 'Type', 'select', { options: brandOpts(['Chain Link', 'Metal Gate', 'Wood Fence', 'Electric Fence', 'Barbed Wire', 'Razor Wire', 'Concrete Wall', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Metal', 'Wood', 'Concrete', 'Wire', 'Other']) })],
  'bathroom-sanitary-ware': [attr('type', 'Product Type', 'select', { options: brandOpts(['Toilet', 'Sink', 'Bathtub', 'Shower', 'Bathroom Cabinet', 'Mirror', 'Faucet', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Ceramic', 'Porcelain', 'Stainless Steel', 'Glass', 'Other']) })],
  'security-alarm-systems': [attr('type', 'System Type', 'select', { options: brandOpts(['Alarm System', 'CCTV', 'Access Control', 'Intercom', 'Motion Detector', 'Smart Lock', 'Other']) })],
  'other-repair-construction': [attr('type', 'Type', 'text', { placeholder: 'e.g. Repair or construction item' })],
  // Commercial Equipment & Tools
  'medical-equipment-supplies': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Diagnostic', 'Surgical', 'Patient Monitor', 'Hospital Bed', 'Ventilator', 'Lab Equipment', 'Sterilizer', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'safety-equipment-protective-gear': [attr('type', 'Gear Type', 'select', { options: brandOpts(['Helmet', 'Safety Vest', 'Gloves', 'Goggles', 'Mask', 'Harness', 'Fire Extinguisher', 'Boots', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'manufacturing-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Packaging Machine', 'Processing Machine', 'Mixer', 'Conveyor', 'Molding Machine', 'CNC', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'manufacturing-materials-supplies': [attr('type', 'Material Type', 'select', { options: brandOpts(['Raw Material', 'Packaging Material', 'Chemical', 'Additive', 'Consumable', 'Other']) })],
  'office-furniture-equipment': [attr('type', 'Type', 'select', { options: brandOpts(['Office Desk', 'Office Chair', 'Filing Cabinet', 'Bookshelf', 'Conference Table', 'Whiteboard', 'Water Dispenser', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'restaurant-catering-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Commercial Oven', 'Fridge/Freezer', 'Cooking Range', 'Food Processor', 'Dishwasher', 'Warming Cabinet', 'Counter', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'retail-shop-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Shelf', 'Display Case', 'Cash Register', 'POS System', 'Shopping Cart', 'Mannequin', 'Signage', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'agriculture-farm-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Tractor', 'Plow', 'Harvester', 'Irrigation', 'Water Pump', 'Sprayer', 'Chaff Cutter', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'printing-packaging-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Printing Press', 'Laminator', 'Cutting Machine', 'Binding Machine', 'Sealer', 'Label Printer', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'laboratory-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Microscope', 'Centrifuge', 'Incubator', 'Balance', 'Glassware', 'Test Kit', 'Spectrophotometer', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'other-commercial-equipment': [attr('type', 'Type', 'text', { placeholder: 'e.g. Commercial equipment type' }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  // Leisure & Activities
  'sports-equipment-gear': [attr('type', 'Sport Type', 'select', { options: brandOpts(['Football', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Volleyball', 'Boxing', 'Gym Wear', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'bicycles-cycling': [attr('type', 'Bicycle Type', 'select', { options: brandOpts(['Mountain Bike', 'Road Bike', 'City Bike', 'BMX', 'Kids Bike', 'Electric Bike', 'Folding Bike', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts }), attr('wheel_size', 'Wheel Size', 'select', { options: brandOpts(['16"', '20"', '24"', '26"', '27.5"', '29"']) })],
  'musical-instruments-gear': [attr('type', 'Instrument Type', 'select', { options: brandOpts(['Guitar', 'Keyboard', 'Drums', 'Violin', 'Saxophone', 'Flute', 'Trumpet', 'Piano', 'Traditional', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts }), attr('brand', 'Brand', 'text', { placeholder: 'e.g. Yamaha, Roland' })],
  'personal-mobility': [attr('type', 'Device Type', 'select', { options: brandOpts(['Electric Scooter', 'Electric Bike', 'Segway', 'Hoverboard', 'Wheelchair', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'massagers-relaxation': [attr('type', 'Product Type', 'select', { options: brandOpts(['Massage Gun', 'Foot Massager', 'Neck Massager', 'Massage Chair', 'Handheld Massager', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'camping-hiking': [attr('type', 'Gear Type', 'select', { options: brandOpts(['Tent', 'Sleeping Bag', 'Backpack', 'Camping Stove', 'Cooler', 'Flashlight', 'Hiking Boots', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'fitness-exercise-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Treadmill', 'Exercise Bike', 'Dumbbell', 'Weight Bench', 'Yoga Mat', 'Resistance Band', 'Elliptical', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'books-magazines': [attr('genre', 'Genre', 'select', { options: brandOpts(['Fiction', 'Non-Fiction', 'Educational', 'Children', 'Comics', 'Magazine', 'Religious', 'Biography', 'Self-Help', 'Other']) }), attr('format', 'Format', 'select', { options: brandOpts(['Paperback', 'Hardcover', 'eBook', 'Audiobook', 'Magazine']) }), attr('language', 'Language', 'select', { options: brandOpts(['English', 'Luganda', 'Swahili', 'French', 'Arabic', 'Other']) })],
  'art-collectibles': [attr('type', 'Art Type', 'select', { options: brandOpts(['Painting', 'Sculpture', 'Photograph', 'Drawing', 'Print', 'Collectible', 'Antique', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Canvas', 'Oil', 'Acrylic', 'Watercolor', 'Metal', 'Wood', 'Clay', 'Other']) })],
  'other-leisure-activities': [attr('type', 'Type', 'text', { placeholder: 'e.g. Leisure item type' })],
  // Babies & Kids
  'toys-games': [attr('type', 'Toy Type', 'select', { options: brandOpts(['Action Figure', 'Doll', 'Building Block', 'Puzzle', 'Board Game', 'Remote Control', 'Educational Toy', 'Outdoor Toy', 'Other']) }), attr('age_range', 'Age Range', 'select', { options: brandOpts(['0-12 months', '1-3 years', '3-5 years', '5-8 years', '8-12 years', '12+ years']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'childrens-furniture': [attr('type', 'Furniture Type', 'select', { options: brandOpts(['Bed', 'Desk', 'Chair', 'Bookshelf', 'Toy Box', 'Wardrobe', 'Table', 'Other']) }), attr('material', 'Material', 'select', { options: brandOpts(['Wood', 'Plastic', 'Metal', 'Fabric', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'baby-gear-accessories': [attr('type', 'Gear Type', 'select', { options: brandOpts(['Baby Carrier', 'Baby Wrap', 'Diaper Bag', 'Baby Monitor', 'Bath Tub', 'Baby Swing', 'Playpen', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'diapers-baby-care': [attr('type', 'Product Type', 'select', { options: brandOpts(['Diaper', 'Wipes', 'Cream', 'Baby Powder', 'Shampoo', 'Lotion', 'Oil', 'Other']) }), attr('size', 'Size', 'select', { options: brandOpts(['Newborn', 'Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5', 'Size 6']) })],
  'feeding-nursing': [attr('type', 'Product Type', 'select', { options: brandOpts(['Baby Bottle', 'Breast Pump', 'Sippy Cup', 'High Chair', 'Baby Food', 'Formula', 'Bibs', 'Nursing Cover', 'Other']) })],
  'strollers-car-seats': [attr('type', 'Product Type', 'select', { options: brandOpts(['Stroller', 'Car Seat', 'Travel System', 'Jogger', 'Umbrella Stroller', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'nursery-furniture-decor': [attr('type', 'Product Type', 'select', { options: brandOpts(['Crib', 'Changing Table', 'Nursery Decor', 'Mobile', 'Rocker', 'Night Light', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'educational-toys-books': [attr('type', 'Type', 'select', { options: brandOpts(['Educational Toy', 'Learning Book', 'Flashcards', 'Puzzle', 'STEM Kit', 'Language Learning', 'Other']) }), attr('age_range', 'Age Range', 'select', { options: brandOpts(['0-12 months', '1-3 years', '3-5 years', '5-8 years', '8-12 years']) })],
  'other-babies-kids': [attr('type', 'Type', 'text', { placeholder: 'e.g. Baby/kid item type' })],
  // Food, Agriculture & Farming
  'farm-animals-livestock': [attr('type', 'Animal Type', 'select', { options: brandOpts(['Cattle', 'Goat', 'Sheep', 'Chicken', 'Pig', 'Rabbit', 'Duck', 'Turkey', 'Other']) }), attr('age', 'Age', 'select', { options: brandOpts(['Young', 'Adult', 'Mixed']) })],
  'seeds-fertilizers-feeds': [attr('type', 'Product Type', 'select', { options: brandOpts(['Seeds', 'Fertilizer', 'Animal Feed', 'Pesticide', 'Soil', 'Other']) })],
  'farm-machinery-equipment': [attr('type', 'Equipment Type', 'select', { options: brandOpts(['Tractor', 'Plow', 'Irrigation', 'Generator', 'Milking Machine', 'Incubator', 'Feed Mixer', 'Other']) }), attr('condition', 'Condition', 'select', { options: conditionOpts })],
  'fresh-produce-groceries': [attr('type', 'Product Type', 'select', { options: brandOpts(['Fruit', 'Vegetable', 'Meat', 'Fish', 'Eggs', 'Dairy', 'Bakery', 'Other']) }), attr('unit', 'Unit', 'select', { options: brandOpts(['Per Kg', 'Per Piece', 'Per Bunch', 'Per Sack', 'Per Crate']) })],
  // Animals & Pets
  'fish-aquariums': [attr('type', 'Type', 'select', { options: brandOpts(['Tropical Fish', 'Goldfish', 'Aquarium Tank', 'Filter', 'Heater', 'Decor', 'Food', 'Other']) })],
  birds: [attr('type', 'Bird Type', 'select', { options: brandOpts(['Parrot', 'Cockatiel', 'Lovebird', 'Canary', 'Finch', 'Pigeon', 'Chicken', 'Duck', 'Other']) }), attr('age', 'Age', 'select', { options: brandOpts(['Baby', 'Young', 'Adult']) })],
  'pet-accessories-supplies': [attr('type', 'Accessory Type', 'select', { options: brandOpts(['Collar', 'Leash', 'Bed', 'Cage', 'Bowl', 'Toye', 'Grooming Tool', 'Carrier', 'Other']) }), attr('pet_type', 'Pet Type', 'select', { options: brandOpts(['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other']) })],
  'pet-food-treats': [attr('type', 'Food Type', 'select', { options: brandOpts(['Dry Food', 'Wet Food', 'Treats', 'Bones', 'Supplements']) }), attr('pet_type', 'Pet Type', 'select', { options: brandOpts(['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other']) })],
  'other-pets': [attr('type', 'Pet Type', 'text', { placeholder: 'e.g. Rabbit, Guinea pig' })],
  // Jobs - common template for all job sub-categories
};

const jobAttrs: AttributeDef[] = [attr('employment_type', 'Employment Type', 'select', { options: brandOpts(['Full Time', 'Part Time', 'Contract', 'Internship', 'Remote'])}), attr('experience', 'Experience', 'select', { options: brandOpts(['Entry Level', 'Mid Level', 'Senior', 'Manager', 'Executive'])})];

export function getAttributesForCategory(slug: string): AttributeDef[] {
  if (categoryAttributes[slug]) return categoryAttributes[slug];
  if (slug.endsWith('-jobs') || slug.endsWith('-cvs')) return jobAttrs;
  return [];
}
