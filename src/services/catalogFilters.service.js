import { Retailer } from '../models/retailer.model.js';

export const CATEGORY_SPECIFICATION_REQUIREMENTS = [
  { roots: ['mobiles'], fields: ['processor', 'displaySize', 'displayType', 'resolution', 'refreshRate', 'batteryCapacity', 'rearCamera', 'frontCamera', 'operatingSystem', 'network', 'simType'] },
  { roots: ['tvs'], fields: ['screenSize', 'displayType', 'resolution', 'refreshRate', 'hdr', 'smartTv', 'operatingSystem', 'hdmiPorts', 'usbPorts', 'wifi', 'bluetooth', 'speakerOutput'] },
  { roots: ['air-conditioners'], fields: ['acType', 'capacity', 'starRating', 'coolingCapacity', 'compressorType', 'inverter', 'energyRating', 'roomSize', 'refrigerant', 'wifi', 'noiseLevel'] },
  { roots: ['laptops'], fields: ['processor', 'processorGeneration', 'ram', 'ramType', 'storage', 'storageType', 'displaySize', 'resolution', 'refreshRate', 'graphicsCard', 'operatingSystem', 'battery', 'weight'] },
  { roots: ['refrigerators'], fields: ['refrigeratorType', 'capacity', 'doorType', 'energyRating', 'compressorType', 'coolingTechnology', 'defrostSystem', 'starRating', 'height', 'width', 'depth'] },
  { roots: ['washing-machines'], fields: ['washingMachineType', 'loadType', 'capacity', 'motorType', 'spinSpeed', 'energyRating', 'washPrograms', 'inverter', 'displayType'] },
  { roots: ['audio'], fields: ['audioType', 'connectivity'] },
];

export const CATEGORY_FILTER_FIELDS = {
  mobiles: [
    { key: 'brand', label: 'Brand', source: 'brand' },
    { key: 'ram', label: 'RAM', source: 'spec', specKey: 'ram' },
    { key: 'storage', label: 'Storage', source: 'spec', specKey: 'storage' },
    { key: 'network', label: 'Network', source: 'spec', specKey: 'network' },
  ],
  tvs: [
    { key: 'brand', label: 'Brand', source: 'brand' },
    { key: 'screenSize', label: 'Display size', source: 'spec', specKey: 'screenSize' },
    { key: 'resolution', label: 'Resolution', source: 'spec', specKey: 'resolution' },
    { key: 'smartPlatform', label: 'Smart platform', source: 'spec', specKey: 'smartPlatform' },
  ],
  'air-conditioners': [
    { key: 'brand', label: 'Brand', source: 'brand' },
    { key: 'tonnage', label: 'Tonnage', source: 'spec', specKey: 'tonnage' },
    { key: 'energyRating', label: 'Star rating', source: 'spec', specKey: 'energyRating' },
    { key: 'inverter', label: 'Inverter', source: 'spec', specKey: 'inverter' },
  ],
  laptops: [
    { key: 'brand', label: 'Brand', source: 'brand' },
    { key: 'processor', label: 'Processor', source: 'spec', specKey: 'processor' },
    { key: 'ram', label: 'RAM', source: 'spec', specKey: 'ram' },
    { key: 'storage', label: 'Storage', source: 'spec', specKey: 'storage' },
  ],
  refrigerators: [
    { key: 'brand', label: 'Brand', source: 'brand' },
    { key: 'capacity', label: 'Capacity', source: 'spec', specKey: 'capacity' },
    { key: 'doorType', label: 'Door type', source: 'spec', specKey: 'doorType' },
    { key: 'energyRating', label: 'Energy rating', source: 'spec', specKey: 'energyRating' },
  ],
  'washing-machines': [
    { key: 'brand', label: 'Brand', source: 'brand' },
    { key: 'capacity', label: 'Capacity', source: 'spec', specKey: 'capacity' },
    { key: 'loadType', label: 'Load type', source: 'spec', specKey: 'loadType' },
    { key: 'energyRating', label: 'Energy rating', source: 'spec', specKey: 'energyRating' },
  ],
  audio: [
    { key: 'brand', label: 'Brand', source: 'brand' },
    { key: 'audioType', label: 'Type', source: 'spec', specKey: 'audioType' },
    { key: 'connectivity', label: 'Connectivity', source: 'spec', specKey: 'connectivity' },
  ],
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const specificationsToObject = (specifications) => {
  if (!specifications) return {};
  if (specifications instanceof Map) return Object.fromEntries(specifications);
  if (typeof specifications.toObject === 'function') return specifications.toObject();
  return { ...specifications };
};

export const CATEGORY_SEARCH_ALIASES = {
  all: null,
  mobile: 'mobiles',
  mobiles: 'mobiles',
  tv: 'tvs',
  tvs: 'tvs',
  television: 'tvs',
  televisions: 'tvs',
  ac: 'air-conditioners',
  'air-conditioner': 'air-conditioners',
  'air-conditioners': 'air-conditioners',
  laptop: 'laptops',
  laptops: 'laptops',
  refrigerator: 'refrigerators',
  refrigerators: 'refrigerators',
  'washing-machine': 'washing-machines',
  'washing-machines': 'washing-machines',
  audio: 'audio',
};

export const getCategoryRootSlug = (slug = '') => {
  const roots = Object.keys(CATEGORY_FILTER_FIELDS);
  return roots.find((root) => slug === root || slug.startsWith(`${root}-`)) || null;
};

export const getCategorySpecificationDefinitions = (category = {}) => {
  const configured = category.specificationDefinitions?.length
    ? category.specificationDefinitions
    : category.filterSchema?.length
      ? category.filterSchema
      : null;
  if (configured) return configured;
  const root = getCategoryRootSlug(category.slug);
  const rule = CATEGORY_SPECIFICATION_REQUIREMENTS.find((item) => item.roots.includes(root));
  return (rule?.fields || []).map((key) => ({
    key,
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
    type: 'text',
    required: true,
    options: [],
  }));
};

export const resolveSearchCategorySlug = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!normalized || normalized === 'all') return null;
  return CATEGORY_SEARCH_ALIASES[normalized] || normalized;
};

export const validateCategorySpecifications = (category, specifications = {}) => {
  const values = specificationsToObject(specifications);
  const definitions = getCategorySpecificationDefinitions(category);
  const missing = definitions
    .filter((definition) => definition.required !== false)
    .filter((definition) => !String(values[definition.key] ?? '').trim())
    .map((definition) => definition.key);
  return missing.length ? `Complete required ${category.name} specifications: ${missing.join(', ')}.` : null;
};

export const parseFilterValues = (value) => {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const applyCategoryProductFilters = (filter, query, category) => {
  const root = getCategoryRootSlug(category.slug);
  const fields = [
    { key: 'brand', label: 'Brand', source: 'brand' },
    ...getCategorySpecificationDefinitions(category).map((definition) => ({
      key: definition.key,
      label: definition.label,
      source: 'spec',
      specKey: definition.key,
    })),
  ];
  const configuredFields = (category.specificationDefinitions?.length || category.filterSchema?.length)
    ? null
    : CATEGORY_FILTER_FIELDS[root];
  const filterFields = configuredFields || fields;
  const applied = {};

  for (const field of filterFields) {
    const values = parseFilterValues(query[field.key]);
    if (!values.length) continue;
    applied[field.key] = values;
    if (field.source === 'brand') {
      filter.brand = { $in: values.map((item) => new RegExp(`^${escapeRegex(item)}$`, 'i')) };
    } else {
      const path = `specifications.${field.specKey}`;
      filter[path] = values.length === 1 ? values[0] : { $in: values };
    }
  }

  if (query.minPrice || query.maxPrice) {
    filter['pricing.sellingPrice'] = {};
    if (query.minPrice) filter['pricing.sellingPrice'].$gte = Number(query.minPrice);
    if (query.maxPrice) filter['pricing.sellingPrice'].$lte = Number(query.maxPrice);
    applied.minPrice = query.minPrice || undefined;
    applied.maxPrice = query.maxPrice || undefined;
  }

  return applied;
};

export const getApprovedSellerIds = async () => {
  const sellers = await Retailer.find({ isActive: true, sellerStatus: 'APPROVED' }).select('_id').lean();
  return sellers.map((seller) => seller._id);
};

export const buildCategoryFacets = async (ProductModel, baseFilter, category) => {
  const root = getCategoryRootSlug(category.slug);
  const fields = (category.specificationDefinitions?.length || category.filterSchema?.length) ? [
    { key: 'brand', label: 'Brand', source: 'brand' },
    ...getCategorySpecificationDefinitions(category).map((definition) => ({
      key: definition.key, label: definition.label, source: 'spec', specKey: definition.key,
    })),
  ] : (CATEGORY_FILTER_FIELDS[root] || [
    { key: 'brand', label: 'Brand', source: 'brand' },
    ...getCategorySpecificationDefinitions(category).map((definition) => ({
      key: definition.key,
      label: definition.label,
      source: 'spec',
      specKey: definition.key,
    })),
  ]);
  const group = { _id: null, brand: { $addToSet: '$brand' } };

  for (const field of fields) {
    if (field.source === 'spec') {
      group[field.key] = { $addToSet: `$specifications.${field.specKey}` };
    }
  }

  const [result] = await ProductModel.aggregate([{ $match: baseFilter }, { $group: group }]);
  const clean = (values = []) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  return fields.map((field) => ({
    key: field.key,
    label: field.label,
    values: clean(result?.[field.key] || (field.source === 'brand' ? result?.brand : [])),
  }));
};
