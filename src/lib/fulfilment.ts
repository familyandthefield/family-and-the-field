export const COLLECT_LABEL = "Collect from Noa Bakehouse, Douglas (free)";
export const DELIVERY_LABEL = "Home delivery";
export const FULFILMENT_FIELD = "collection-or-delivery";

/** Goods total must be over £20. £20.00 exactly does not qualify. */
export const DELIVERY_MINIMUM_PENCE = 2000;

export const DELIVERY_RULES =
  "Pickup is free at Noa Bakehouse. Home delivery is available on orders over \u00a320 (two working days\u2019 lead time, 12:00\u201319:00 window).";

export const CHOOSE_FULFILMENT = "Choose collection or home delivery.";

export function subtotalPence(amount: number): number {
  return Math.round(amount * 100);
}

export function deliveryAllowed(subtotal: number): boolean {
  return subtotalPence(subtotal) > DELIVERY_MINIMUM_PENCE;
}

export function formatPounds(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export function deliveryWarning(subtotal: number): string {
  return `${DELIVERY_RULES} This basket is ${formatPounds(subtotal)}, so home delivery can\u2019t be chosen yet. Add more, or choose ${COLLECT_LABEL}.`;
}
