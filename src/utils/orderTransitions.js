export const allowedOrderTransitions = Object.freeze({
  PENDING: Object.freeze(['ACCEPTED', 'CONFIRMED', 'CANCELLED']),
  ACCEPTED: Object.freeze(['DELIVERED', 'CANCELLED']),
  CONFIRMED: Object.freeze(['PROCESSING', 'ACCEPTED', 'CANCELLED']),
  PROCESSING: Object.freeze(['ACCEPTED', 'SHIPPED', 'CANCELLED']),
  SHIPPED: Object.freeze(['OUT_FOR_DELIVERY', 'DELIVERED']),
  OUT_FOR_DELIVERY: Object.freeze(['DELIVERED']),
  DELIVERED: Object.freeze([]),
  CANCELLED: Object.freeze([]),
  RETURNED: Object.freeze([]),
});

export const canTransitionOrder = (fromStatus, toStatus) =>
  allowedOrderTransitions[fromStatus]?.includes(toStatus) === true;
