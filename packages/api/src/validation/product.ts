import { z } from 'zod';
import { ProductStatus } from '@nexus/shared';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  slug: z.string().min(1).max(200),
  brand: z.string().max(100).default(''),
  sku: z.string().min(1, 'SKU is required').max(100),
  description: z.string().default(''),
  specifications: z.record(z.string()).default({}),
  features: z.array(z.string()).default([]),
  price: z.number().positive('Price must be greater than 0'),
  compareAtPrice: z.number().positive().nullable().optional(),
  costPerItem: z.number().positive().nullable().optional(),
  currency: z.string().default('UGX'),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(10),
  trackInventory: z.boolean().default(true),
  allowBackorder: z.boolean().default(false),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  categoryId: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().max(200).default(''),
  seoDescription: z.string().max(500).default(''),
  returnPolicy: z.string().default(''),
  warranty: z.string().default(''),
  weight: z.number().min(0).default(0),
  weightUnit: z.string().default('kg'),
  shippingClass: z.string().default('standard'),
  estimatedDays: z.string().default(''),
  freeShipping: z.boolean().default(false),
  images: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1).max(100),
  price: z.number().min(0),
  stock: z.number().int().min(0).default(0),
  options: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
  image: z.string().default(''),
});

export const updateVariantSchema = createVariantSchema.partial();

export const bulkVariantsSchema = z.object({
  variants: z.array(createVariantSchema),
});
