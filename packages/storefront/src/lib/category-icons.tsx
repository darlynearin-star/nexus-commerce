import type { ComponentProps } from 'react';
import {
  Accessibility, Ambulance, Anvil, Armchair, Baby, Bath, Battery, BatteryCharging, BedDouble, Beef, Bird, Bike, Bone, BookOpen, Boxes, BrickWall, Briefcase, Brush, Building, Building2, Bus, Cable, Camera, Car, Caravan, CarFront, Carrot, Cat, Cctv, CircuitBoard, Clapperboard, ClipboardList, Coffee, Cog, Coins, Construction, CookingPot, Cpu, Cross, Dog, DoorOpen, Droplet, Droplets, Dumbbell, Ear, Eye, Factory, Fence, FileText, Fish, Flame, FlaskConical, Flower, Flower2, Footprints, Gamepad2, Gem, Glasses, GraduationCap, Grid3x3, Guitar, Hammer, Hand, HardHat, Headphones, Headset, Heart, HeartHandshake, Home, Image, Lamp, LandPlot, Laptop, Leaf, Lightbulb, Luggage, Megaphone, Milk, Monitor, Mouse, Music, Newspaper, Package, Paintbrush, Palette, Palmtree, ParkingSquare, PartyPopper, PawPrint, PenTool, PersonStanding, Pill, Plug, Printer, Rabbit, Radio, RadioTower, Refrigerator, Router, Sailboat, Scale, Scissors, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, ShowerHead, Siren, Smartphone, Smile, Sofa, Sparkles, Speaker, SprayCan, Sprout, Stethoscope, Sun, Tablet, TabletSmartphone, Target, Tent, ToyBrick, Tractor, Trophy, Truck, Tv, Usb, Users, UtensilsCrossed, Wand, Watch, Wheat, Wrench, Zap, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  vehicles: Car, cars: CarFront, 'motorcycles-scooters': Bike, 'buses-microbuses': Bus,
  'vehicle-parts-accessories': Wrench, 'trucks-trailers': Truck, 'boats-watercraft': Sailboat,
  'heavy-equipment': Anvil, 'car-audio-electronics': Radio, 'other-vehicles': Caravan,
  property: Home, 'houses-apartments-sale': Home, 'houses-apartments-rent': Building2,
  'short-let-vacation-rentals': Palmtree, 'land-plots': LandPlot, 'commercial-property-sale': Building,
  'commercial-property-rent': Building2, 'new-builds': Construction, 'rooms-rent-shared': DoorOpen,
  'parking-storage': ParkingSquare,
  'phones-tablets': Smartphone, 'mobile-phones': Smartphone, tablets: Tablet, 'smart-watches': Watch,
  'phone-tablet-accessories': Headphones, 'phone-parts-repair-tools': Wrench,
  electronics: Laptop, 'laptops-computers': Laptop, 'tv-video-equipment': Tv,
  'video-game-consoles': Gamepad2, 'audio-music-equipment': Music, 'cameras-photography': Camera,
  'computer-accessories': Mouse, 'printers-scanners': Printer, 'networking-modems': Router,
  'monitors-displays': Monitor, 'computer-components': Cpu, 'home-audio-speakers': Speaker,
  'car-electronics': Radio, 'security-surveillance': Cctv, 'smart-home-devices': TabletSmartphone,
  'other-electronics': Usb,
  'home-furniture-appliances': Sofa, furniture: Armchair, lighting: Lamp,
  'storage-organization': Boxes, 'home-accessories-decor': Image, 'kitchen-dining': UtensilsCrossed,
  'bedding-bath': BedDouble, 'major-appliances': Refrigerator, 'small-kitchen-appliances': Coffee,
  'garden-outdoor': Flower2,
  fashion: Shirt, 'womens-fashion': Shirt, 'womens-clothing': Shirt, 'womens-shoes': Footprints,
  'womens-bags': ShoppingBag, 'womens-jewelry': Gem, 'womens-watches': Watch,
  'womens-clothing-accessories': Scissors, 'womens-wedding-wear': Heart,
  'mens-fashion': Shirt, 'mens-clothing': Shirt, 'mens-shoes': Footprints, 'mens-bags': Briefcase,
  'mens-jewelry': Gem, 'mens-watches': Watch, 'mens-clothing-accessories': Glasses,
  'mens-wedding-wear': Heart, 'baby-kids-fashion': Baby, 'childrens-clothing': Shirt,
  'childrens-shoes': Footprints, 'babies-kids-accessories': ToyBrick,
  'beauty-personal-care': Sparkles, 'hair-beauty': Scissors, 'face-care-skin-care': Droplet,
  'oral-care': Brush, 'body-care-bath': Bath, 'makeup-cosmetics': Brush,
  'fragrance-deodorants': Flower, 'nail-care': Hand, 'mens-grooming': Scissors,
  'beauty-tools-accessories': Wand, 'wellness-relaxation': Flower2, 'other-beauty-personal-care': Sparkles,
  'medicine-health': Pill, 'vitamins-supplements': Pill, 'herbal-remedies': Leaf,
  'first-aid-emergency': Ambulance, 'medical-equipment-devices': Stethoscope, 'pharmacy-prescription': Pill,
  'fitness-nutrition': Dumbbell, 'sexual-wellness': Heart, 'eye-care-vision': Eye,
  'hearing-audiology': Ear, 'orthopedic-mobility-aids': Accessibility,
  'maternity-baby-health': Baby, 'other-health-supplies': Cross,
  services: Wrench, 'building-trades-services': HardHat, 'car-services-automotive': Car,
  'computer-it-services': Monitor, 'repair-services': Hammer, 'cleaning-domestic-services': SprayCan,
  'health-beauty-services': Sparkles, 'photography-videography': Camera,
  'event-planning-catering': PartyPopper, 'tutoring-education': GraduationCap, 'legal-services': Scale,
  'financial-accounting-services': Coins, 'marketing-advertising': Megaphone,
  'web-mobile-development': Laptop, 'writing-translation': PenTool, 'logistics-delivery': Package,
  'moving-relocation': Truck, 'pet-services': PawPrint, 'travel-tours': Luggage,
  'fitness-personal-training': Dumbbell, 'music-entertainment': Music,
  'printing-stationery': Printer, 'design-creative': Palette, 'security-services': ShieldCheck,
  consulting: Lightbulb, 'other-services': ClipboardList,
  'repair-construction': Wrench, 'electrical-equipment': Zap, generators: BatteryCharging,
  'solar-renewable-energy': Sun, 'inverters-backup-batteries': Battery,
  'switches-sockets-distribution': Plug, 'stabilizers-voltage-protection': Zap,
  'welding-machinery-construction': Flame, 'industrial-electrical-automation': Factory,
  'electronic-components-sensors': CircuitBoard, 'cables-wires': Cable,
  'building-materials-supplies': BrickWall, 'plumbing-water-systems': Droplets,
  'electrical-hand-tools': Wrench, 'construction-heavy-machinery': Anvil,
  'paints-coatings': Paintbrush, 'doors-windows': DoorOpen, 'flooring-tiles': Grid3x3,
  'roofing-gutters': Home, 'fencing-gates': Fence, 'bathroom-sanitary-ware': ShowerHead,
  'security-alarm-systems': Siren, 'other-repair-construction': Hammer,
  'commercial-equipment-tools': Factory, 'medical-equipment-supplies': Stethoscope,
  'safety-equipment-protective-gear': HardHat, 'manufacturing-equipment': Factory,
  'manufacturing-materials-supplies': Boxes, 'office-furniture-equipment': Armchair,
  'restaurant-catering-equipment': CookingPot, 'retail-shop-equipment': ShoppingCart,
  'agriculture-farm-equipment': Tractor, 'printing-packaging-equipment': Package,
  'laboratory-equipment': FlaskConical, 'other-commercial-equipment': Cog,
  'leisure-activities': Target, 'sports-equipment-gear': Trophy, 'bicycles-cycling': Bike,
  'musical-instruments-gear': Guitar, 'personal-mobility': PersonStanding, 'massagers-relaxation': Hand,
  'camping-hiking': Tent, 'fitness-exercise-equipment': Dumbbell, 'books-magazines': BookOpen,
  'art-collectibles': Palette, 'other-leisure-activities': PartyPopper,
  'babies-kids': Baby, 'toys-games': ToyBrick, 'childrens-furniture': BedDouble,
  'baby-gear-accessories': Baby, 'diapers-baby-care': Baby, 'feeding-nursing': Milk,
  'strollers-car-seats': Baby, 'nursery-furniture-decor': BedDouble, 'educational-toys-books': BookOpen,
  'other-babies-kids': Smile,
  'food-agriculture-farming': Wheat, 'food-beverages': UtensilsCrossed,
  'farm-animals-livestock': Beef, 'seeds-fertilizers-feeds': Sprout,
  'farm-machinery-equipment': Tractor, 'fresh-produce-groceries': Carrot,
  'animals-pets': PawPrint, 'dogs-puppies': Dog, 'cats-kittens': Cat,
  'fish-aquariums': Fish, birds: Bird, 'pet-accessories-supplies': Bone,
  'pet-food-treats': Bone, 'other-pets': Rabbit,
  jobs: Briefcase, 'accounting-finance-jobs': Coins, 'advertising-marketing-jobs': Megaphone,
  'arts-entertainment-jobs': Clapperboard, 'childcare-babysitting-jobs': Baby,
  'cleaning-domestic-jobs': SprayCan, 'construction-trades-jobs': HardHat,
  'customer-service-jobs': Headset, 'education-training-jobs': GraduationCap,
  'engineering-technical-jobs': Cog, 'food-service-hospitality-jobs': CookingPot,
  'healthcare-nursing-jobs': Stethoscope, 'hr-recruitment-jobs': Users,
  'it-software-development-jobs': Laptop, 'legal-jobs': Scale,
  'logistics-transportation-jobs': Truck, 'manufacturing-production-jobs': Factory,
  'marketing-pr-jobs': Megaphone, 'media-journalism-jobs': Newspaper,
  'ngo-social-work-jobs': HeartHandshake, 'office-admin-jobs': ClipboardList,
  'real-estate-property-jobs': Building2, 'retail-sales-jobs': ShoppingCart,
  'security-military-jobs': ShieldCheck, 'telecommunications-jobs': RadioTower,
  'training-internship': GraduationCap, 'transport-driving-jobs': Car,
  'travel-tourism-jobs': Luggage, 'other-jobs': ClipboardList,
  'seeking-work-cvs': FileText, 'accounting-finance-cvs': Coins, 'advertising-marketing-cvs': Megaphone,
  'arts-entertainment-cvs': Clapperboard, 'childcare-babysitting-cvs': Baby,
  'cleaning-domestic-cvs': SprayCan, 'construction-trades-cvs': HardHat,
  'customer-service-cvs': Headset, 'education-training-cvs': GraduationCap,
  'engineering-technical-cvs': Cog, 'food-service-hospitality-cvs': CookingPot,
  'healthcare-nursing-cvs': Stethoscope, 'hr-recruitment-cvs': Users,
  'it-software-development-cvs': Laptop, 'legal-cvs': Scale,
  'logistics-transportation-cvs': Truck, 'manufacturing-production-cvs': Factory,
  'marketing-pr-cvs': Megaphone, 'media-journalism-cvs': Newspaper,
  'ngo-social-work-cvs': HeartHandshake, 'office-admin-cvs': ClipboardList,
  'real-estate-property-cvs': Building2, 'retail-sales-cvs': ShoppingCart,
  'security-military-cvs': ShieldCheck, 'telecommunications-cvs': RadioTower,
  'training-internship-cvs': GraduationCap, 'transport-driving-cvs': Car,
  'travel-tourism-cvs': Luggage, 'other-cvs': FileText,
};

const FALLBACK_BY_KEYWORD: [RegExp, LucideIcon][] = [
  [/car|vehicle|auto/i, Car], [/phone|mobile|smartphone/i, Smartphone],
  [/computer|laptop|pc|tech|electronic/i, Laptop], [/home|furniture|house/i, Home],
  [/cloth|fashion|wear|apparel/i, Shirt], [/beauty|cosmetic|makeup|skin|hair/i, Sparkles],
  [/food|grocer|agric|farm|fresh/i, Wheat], [/pet|animal|dog|cat/i, PawPrint],
  [/job|work|career|employment/i, Briefcase], [/cv|resume|seeking/i, FileText],
  [/service|repair|maintenance/i, Wrench], [/sport|fitness|leisure|game|toy/i, Target],
  [/baby|kid|children|toddler/i, Baby], [/medical|health|wellness|medicine|pharmacy|hospital/i, Stethoscope],
  [/commercial|equipment|industrial/i, Factory], [/property|land|apartment|rent/i, Home],
  [/accessor|jewelry|watch|bag/i, ShoppingBag], [/shoe|footwear/i, Footprints],
  [/book|magazine|read/i, BookOpen], [/music|instrument/i, Music],
  [/camera|photo|video/i, Camera], [/tool|construction|build/i, Hammer],
  [/part|repair/i, Wrench], [/other/i, ClipboardList],
];

const CATEGORY_COLORS: [RegExp, string][] = [
  [/car|vehicle|auto|motorcycle|scooter|bus|truck|trailer|boat|watercraft/i, '#3B82F6'],
  [/house|apartment|property|land-plot|parking|short-let|rent|build|office-furniture|commercial-property/i, '#0D9488'],
  [/smart-watch|phone|tablet/i, '#7C3AED'],
  [/computer|laptop|tv|video|gamepad|console|audio|camera|printer|networking|modem|monitor|cpu|speaker|electronics|surveillance|smart-home|usb|pc/i, '#4F46E5'],
  [/furniture|lighting|storage|kitchen|bedding|appliance|garden|decor|dining/i, '#D97706'],
  [/fashion|cloth|clothing|shoe|footwear|bag|jewelry|watch|scissor|wedding|wear/i, '#DB2777'],
  [/beauty|hair|skin|makeup|cosmetic|fragrance|nail|grooming|oral-care|bath|spa|wellness/i, '#E11D48'],
  [/health|medicine|pharmacy|vitamin|supplement|herbal|first-aid|medical|fitness|eye-care|hearing|orthopedic|mobility|maternity/i, '#059669'],
  [/electrical|generator|solar|inverter|battery|switch|socket|stabilizer|welding|industrial|cable|building-material|plumbing|hand-tools|construction-heavy|paint|doors|flooring|roofing|fencing|bathroom|alarm|siren|repair|weld/i, '#EA580C'],
  [/commercial-equipment|manufacturing|restaurant|retail-shop|agriculture-farm|printing-packaging|laboratory|office/i, '#475569'],
  [/leisure|sport|bicycle|cycling|musical|massager|camping|hiking|book|art|collectible|fitness-exercise/i, '#65A30D'],
  [/baby|kids|children|toy|stroller|diaper|feeding|nursery|toddler/i, '#C026D3'],
  [/food|agric|farm|grocer|produce|livestock|seed|fertilizer/i, '#16A34A'],
  [/pet|animal|dog|cat|fish|aquarium|bird|rabbit/i, '#A16207'],
  [/service|cleaning|photography|event|catering|tutor|legal|financial|accounting|marketing|advertising|web|writing|translation|logistics|moving|travel|tour|printing|stationery|design|security|consulting/i, '#0891B2'],
  [/job|cv|seeking-work|career|employment|recruitment|internship/i, '#0284C7'],
];
const DEFAULT_CATEGORY_COLOR = '#D4A843';

export function categoryColor(slug: string, name?: string): string {
  for (const [pattern, color] of CATEGORY_COLORS) {
    if (pattern.test(slug)) return color;
  }
  if (name) {
    for (const [pattern, color] of CATEGORY_COLORS) {
      if (pattern.test(name)) return color;
    }
  }
  return DEFAULT_CATEGORY_COLOR;
}

export function categoryIcon(slug: string, name?: string): LucideIcon {
  if (ICONS[slug]) return ICONS[slug];
  if (name) {
    for (const [pattern, icon] of FALLBACK_BY_KEYWORD) {
      if (pattern.test(name)) return icon;
    }
  }
  return ShoppingBag;
}

export function CategoryIcon({ slug, name, size = 24, color, ...rest }: { slug: string; name?: string; size?: number; color?: string } & ComponentProps<LucideIcon>) {
  const Icon = categoryIcon(slug, name);
  return <Icon size={size} color={color ?? categoryColor(slug, name)} {...rest} />;
}