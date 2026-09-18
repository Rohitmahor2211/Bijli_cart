import { z } from 'zod';

const optionalFilter = z.string().trim().max(80).optional();

export const catalogProductsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).optional(),
  q: optionalFilter,
  category: optionalFilter,
  brand: optionalFilter,
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  ram: optionalFilter,
  storage: optionalFilter,
  network: optionalFilter,
  screenSize: optionalFilter,
  resolution: optionalFilter,
  smartPlatform: optionalFilter,
  tonnage: optionalFilter,
  energyRating: optionalFilter,
  inverter: optionalFilter,
  processor: optionalFilter,
  capacity: optionalFilter,
  doorType: optionalFilter,
  loadType: optionalFilter,
  audioType: optionalFilter,
  connectivity: optionalFilter,
});
