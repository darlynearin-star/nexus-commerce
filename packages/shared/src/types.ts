// ============================================================
// Role & Permission Types
// ============================================================
export enum UserRole {
  GUEST = 'GUEST',
  CUSTOMER = 'CUSTOMER',
  RETAILER = 'RETAILER',
  DEVELOPER = 'DEVELOPER',
  SUPER_DEVELOPER = 'SUPER_DEVELOPER',
}

export enum Permission {
  // Storefront
  BROWSE_PRODUCTS = 'browse:products',
  PURCHASE_PRODUCTS = 'purchase:products',
  WRITE_REVIEWS = 'write:reviews',
  MANAGE_WISHLIST = 'manage:wishlist',

  // Retailer
  MANAGE_PRODUCTS = 'manage:products',
  MANAGE_INVENTORY = 'manage:inventory',
  MANAGE_ORDERS = 'manage:orders',
  MANAGE_CUSTOMERS = 'manage:customers',
  MANAGE_MARKETING = 'manage:marketing',
  VIEW_REPORTS = 'view:reports',
  MANAGE_SETTINGS = 'manage:settings',
  MANAGE_MEDIA = 'manage:media',

  // Developer
  MANAGE_USERS = 'manage:users',
  MANAGE_ROLES = 'manage:roles',
  MANAGE_SECURITY = 'manage:security',
  MANAGE_DATABASE = 'manage:database',
  MANAGE_SYSTEM = 'manage:system',
  MANAGE_KILL_SWITCH = 'manage:kill_switch',
  VIEW_LOGS = 'view:logs',
  MANAGE_API = 'manage:api',
  MANAGE_CACHE = 'manage:cache',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.GUEST]: [Permission.BROWSE_PRODUCTS],
  [UserRole.CUSTOMER]: [
    Permission.BROWSE_PRODUCTS,
    Permission.PURCHASE_PRODUCTS,
    Permission.WRITE_REVIEWS,
    Permission.MANAGE_WISHLIST,
  ],
  [UserRole.RETAILER]: [
    Permission.BROWSE_PRODUCTS,
    Permission.PURCHASE_PRODUCTS,
    Permission.WRITE_REVIEWS,
    Permission.MANAGE_WISHLIST,
    Permission.MANAGE_PRODUCTS,
    Permission.MANAGE_INVENTORY,
    Permission.MANAGE_ORDERS,
    Permission.MANAGE_CUSTOMERS,
    Permission.MANAGE_MARKETING,
    Permission.VIEW_REPORTS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_MEDIA,
  ],
  [UserRole.DEVELOPER]: Object.values(Permission),
  [UserRole.SUPER_DEVELOPER]: Object.values(Permission),
};

// ============================================================
// Product Types
// ============================================================
export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  sku: string;
  description: string;
  specifications: Record<string, string>;
  features: string[];
  price: number;
  compareAtPrice: number | null;
  costPerItem: number | null;
  currency: string;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  status: ProductStatus;
  categoryId: string;
  category?: Category;
  tags: string[];
  images: Media[];
  videos: Media[];
  variants: ProductVariant[];
  downloads: ProductDownload[];
  seoTitle: string;
  seoDescription: string;
  shipping: ShippingInfo;
  returnPolicy: string;
  warranty: string;
  weight: number;
  weightUnit: string;
  createdAt: string;
  updatedAt: string;
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  options: VariantOption[];
  image: string;
}

export interface VariantOption {
  name: string;
  value: string;
}

export interface ProductDownload {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
}

export interface ShippingInfo {
  weight: number;
  weightUnit: string;
  dimensions: { length: number; width: number; height: number; unit: string };
  shippingClass: string;
  estimatedDays: string;
  freeShipping: boolean;
}

// ============================================================
// Category Types
// ============================================================
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string | null;
  children?: Category[];
  productCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  productCount?: number;
}

// ============================================================
// Order Types
// ============================================================
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  RETURNED = 'RETURNED',
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  couponId: string | null;
  total: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  notes: string;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

// ============================================================
// Customer / User Types
// ============================================================
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  avatar: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  user: User;
  notes: string;
  group: CustomerGroup;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  createdAt: string;
}

export enum CustomerGroup {
  REGULAR = 'REGULAR',
  VIP = 'VIP',
  WHOLESALE = 'WHOLESALE',
}

export interface Address {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

// ============================================================
// Cart Types
// ============================================================
export interface Cart {
  id: string;
  customerId: string | null;
  sessionId: string | null;
  items: CartItem[];
  couponCode: string | null;
  couponDiscount: number;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  product: Product;
}

// ============================================================
// Coupon Types
// ============================================================
export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  maxUsesPerCustomer: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  appliesTo: string[];
}

// ============================================================
// Review Types
// ============================================================
export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
}

// ============================================================
// Notification Types
// ============================================================
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NotificationType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  SHIPPING_UPDATE = 'SHIPPING_UPDATE',
  LOW_STOCK = 'LOW_STOCK',
  PRICE_DROP = 'PRICE_DROP',
  BACK_IN_STOCK = 'BACK_IN_STOCK',
  ABANDONED_CART = 'ABANDONED_CART',
  REVIEW_REMINDER = 'REVIEW_REMINDER',
  ADMIN_ANNOUNCEMENT = 'ADMIN_ANNOUNCEMENT',
  SECURITY_ALERT = 'SECURITY_ALERT',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ============================================================
// Activity Log Types
// ============================================================
export enum ActivityAction {
  // Auth
  USER_LOGIN = 'user:login',
  USER_LOGOUT = 'user:logout',
  USER_REGISTER = 'user:register',

  // Products
  PRODUCT_CREATED = 'product:created',
  PRODUCT_UPDATED = 'product:updated',
  PRODUCT_DELETED = 'product:deleted',

  // Orders
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_REFUNDED = 'order:refunded',
  ORDER_CANCELLED = 'order:cancelled',

  // Customers
  CUSTOMER_CREATED = 'customer:created',
  CUSTOMER_UPDATED = 'customer:updated',
  CUSTOMER_DELETED = 'customer:deleted',

  // Settings
  SETTINGS_MODIFIED = 'settings:modified',

  // Security
  PERMISSION_CHANGED = 'permission:changed',
  KILL_SWITCH_ACTIVATED = 'kill_switch:activated',
  KILL_SWITCH_DEACTIVATED = 'kill_switch:deactivated',
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// ============================================================
// Analytics Types
// ============================================================
export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  conversionRate: number;
  periodStart: string;
  periodEnd: string;
}

// ============================================================
// Kill Switch / System Status
// ============================================================
export interface KillSwitchState {
  storefront: boolean;
  retailerDashboard: boolean;
  customerRegistration: boolean;
  checkout: boolean;
  orders: boolean;
  uploads: boolean;
  payments: boolean;
  apis: boolean;
  search: boolean;
  maintenance: boolean;
  maintenanceMessage: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  cpu: { usage: number; cores: number };
  memory: { total: number; used: number; free: number; usagePercent: number };
  disk: { total: number; used: number; free: number; usagePercent: number };
  database: { status: 'connected' | 'disconnected' | 'error'; latency: number };
  api: { uptime: number; requestsTotal: number; requestsPerMinute: number; avgLatency: number };
  errors: { total: number; warnings: number };
  lastChecked: string;
}

// ============================================================
// API Response Types
// ============================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

// ============================================================
// Wishlist
// ============================================================
export interface Wishlist {
  id: string;
  customerId: string;
  name: string;
  isPublic: boolean;
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  product: Product;
  addedAt: string;
}

// ============================================================
// Media
// ============================================================
export interface Media {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  type: 'image' | 'video' | 'document';
  mimeType: string;
  size: number;
  width: number;
  height: number;
  folder: string;
  createdAt: string;
}

// ============================================================
// Session
// ============================================================
export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
}

// ============================================================
// Store Types
// ============================================================
export interface Store {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  ownerId: string;
  isActive: boolean;
  settings?: StoreSettings;
  theme?: StoreTheme;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  currency: string;
  shippingThreshold: number;
  location: string;
  shippingRate: number;
}

export interface StoreTheme {
  template: string;
  colors: Record<string, string>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  defaultColors: Record<string, string>;
}

// ============================================================
// Feature Flags
// ============================================================
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
}