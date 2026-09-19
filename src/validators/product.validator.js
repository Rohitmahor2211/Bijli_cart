import { z } from "zod";

const parseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const specificationsSchema = z.preprocess(
  parseJson,
  z.record(z.string(), z.string().trim().max(120)).default({}),
);

const baseProductSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().min(2, "SKU is required").optional(),
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  globalCategoryId: z.string().min(24, "Select a valid marketplace category."),
  subcategory: z.string().min(24).optional().nullable(),
  description: z.string().optional(),
  highlights: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value.split("\n");
      }
    },
    z.array(z.string().trim().min(1).max(1000)).max(10).default([]),
  ),
  mrp: z.coerce.number().min(0, "MRP must be non-negative").optional(),
  sellingPrice: z.coerce
    .number()
    .min(0, "Selling price must be non-negative")
    .optional(),
  purchasePrice: z.coerce.number().min(0).optional().default(0),
  discount: z.coerce
    .number()
    .min(0)
    .max(100, "Discount must be between 0 and 100")
    .optional()
    .default(0),
  tax: z.coerce
    .number()
    .min(0, "GST/tax rate cannot be negative")
    .max(100, "GST/tax rate cannot exceed 100%")
    .optional()
    .default(0),
  stockQuantity: z.coerce.number().int().min(0).optional().default(0),
  lowStockThreshold: z.coerce.number().int().min(0).optional().default(5),
  weightKg: z.coerce
    .number()
    .min(0.05, "Package weight must be at least 0.05 kg")
    .default(0.5),
  lengthCm: z.coerce.number().min(1, "Package length is required").default(20),
  breadthCm: z.coerce
    .number()
    .min(1, "Package breadth is required")
    .default(15),
  heightCm: z.coerce.number().min(1, "Package height is required").default(10),
  warrantyAvailable: z.boolean().optional().default(false),
  warrantyDuration: z.string().optional().default(""),
  warrantyDescription: z.string().optional().default(""),
  specifications: specificationsSchema.optional(),
});

const withProductRules = (schema) =>
  schema.superRefine((product, context) => {
    if (
      product.mrp !== undefined &&
      product.sellingPrice !== undefined &&
      product.sellingPrice > product.mrp
    ) {
      context.addIssue({
        code: "custom",
        path: ["sellingPrice"],
        message: "Selling price cannot exceed MRP.",
      });
    }
  });

export const createProductSchema = withProductRules(baseProductSchema);
export const updateProductSchema = withProductRules(
  baseProductSchema.partial(),
);

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  stockStatus: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
  status: z
    .enum(["PENDING_REVIEW", "ACTIVE", "REJECTED", "INACTIVE"])
    .optional(),
  sort: z
    .enum([
      "price_asc",
      "price_desc",
      "created_asc",
      "created_desc",
      "name_asc",
      "name_desc",
    ])
    .optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
