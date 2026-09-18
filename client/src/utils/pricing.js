export const getBaseSellingPrice = (product) =>
  Number(product?.pricing?.sellingPrice ?? product?.price ?? 0);

export const getTaxRate = (product) => Number(product?.pricing?.tax ?? 0);

export const getPriceIncludingTax = (product) => {
  const basePrice = getBaseSellingPrice(product);
  return Math.round((basePrice * (1 + getTaxRate(product) / 100)) * 100) / 100;
};

export const getMrpIncludingTax = (product) => {
  const baseMrp = Number(product?.pricing?.mrp ?? product?.mrp ?? 0);
  return Math.round((baseMrp * (1 + getTaxRate(product) / 100)) * 100) / 100;
};

export const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
