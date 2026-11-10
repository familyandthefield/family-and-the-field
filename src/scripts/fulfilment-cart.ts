import {
  CHOOSE_FULFILMENT,
  DELIVERY_LABEL,
  deliveryAllowed,
  deliveryWarning,
  FULFILMENT_FIELD,
} from "../lib/fulfilment";

type CartItem = { price?: number; unitPrice?: number; quantity?: number };
type CartField = { name?: string; value?: unknown };
type CartSnapshot = {
  subtotal?: number;
  items?: CartItem[];
  customFields?: CartField[] | Record<string, unknown>;
};

let started = false;

export function installFulfilmentGuard(): void {
  if (started || typeof document === "undefined") return;
  started = true;

  const boot = () => {
    syncFulfilment();
    snipcartStore()?.subscribe(() => syncFulfilment());
  };

  document.addEventListener("snipcart.ready", boot);
  document.addEventListener("snipcart.initialized", boot);
  document.addEventListener("click", onClick, true);
  document.addEventListener("change", () => syncFulfilment(), true);
  document.addEventListener("submit", onSubmit, true);
  new MutationObserver(() => syncFulfilment()).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  if (snipcartStore()) boot();
}

function onClick(event: Event): void {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || !target.closest("button, .snipcart-submit")) return;

  const billing = target.closest("#snipcart-billing-form");
  const problem = billing ? billingProblem() : insideLaterCheckout(target) ? paymentProblem() : null;
  if (!problem) return;
  event.preventDefault();
  event.stopPropagation();
  showWarning(problem);
}

function onSubmit(event: Event): void {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form || form.id !== "snipcart-billing-form") return;
  const problem = billingProblem();
  if (!problem) return;
  event.preventDefault();
  event.stopPropagation();
  showWarning(problem);
}

function insideLaterCheckout(target: Element): boolean {
  return Boolean(
    target.closest("#snipcart-payment-form, .snipcart-payment, .snipcart-checkout__step--payment, form.snipcart-shipping-form"),
  );
}

function billingProblem(): string | null {
  if (fulfilmentInputs().length === 0) return null;
  const choice = checkedFulfilment();
  const subtotal = basketSubtotal();
  if (choice === DELIVERY_LABEL && subtotal !== null && !deliveryAllowed(subtotal)) return deliveryWarning(subtotal);
  if (!choice) return CHOOSE_FULFILMENT;
  return null;
}

function paymentProblem(): string | null {
  const choice = storedFulfilment();
  const subtotal = basketSubtotal();
  if (choice !== DELIVERY_LABEL || subtotal === null) return null;
  return deliveryAllowed(subtotal) ? null : deliveryWarning(subtotal);
}

function syncFulfilment(): void {
  const inputs = fulfilmentInputs();
  if (inputs.length === 0) return;
  const subtotal = basketSubtotal();
  const allowed = subtotal === null ? true : deliveryAllowed(subtotal);
  for (const input of inputs) {
    if (input.value !== DELIVERY_LABEL) continue;
    input.disabled = !allowed;
    input.closest("span")?.classList.toggle("fulfilment-blocked", !allowed);
    if (!allowed && input.checked) input.checked = false;
  }

  const message = subtotal !== null && !allowed ? deliveryWarning(subtotal) : "";
  for (const warning of document.querySelectorAll<HTMLElement>("[data-fulfilment-warning]")) {
    const hide = message.length === 0;
    if (warning.hidden !== hide) warning.hidden = hide;
    if (!hide && warning.textContent !== message) warning.textContent = message;
    if (!hide) warning.setAttribute("role", "alert");
  }

  const choice = checkedFulfilment();
  const blocking = !choice || (choice === DELIVERY_LABEL && !allowed);
  for (const gate of document.querySelectorAll<HTMLInputElement>("[data-fulfilment-gate]")) {
    gate.required = true;
    const validity = blocking ? (choice === DELIVERY_LABEL && subtotal !== null ? deliveryWarning(subtotal) : CHOOSE_FULFILMENT) : "";
    if ((gate.value || "") !== (blocking ? "" : "ok")) gate.value = blocking ? "" : "ok";
    if (gate.validationMessage !== validity) gate.setCustomValidity(validity);
  }
}

function fulfilmentInputs(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>(`input[name="${FULFILMENT_FIELD}"]`)];
}

function checkedFulfilment(): string | null {
  const selected = fulfilmentInputs().find((input) => input.checked && !input.disabled);
  return selected?.value ?? null;
}

function storedFulfilment(): string | null {
  const fields = cartSnapshot()?.customFields;
  const list = Array.isArray(fields)
    ? fields
    : fields && typeof fields === "object"
      ? Object.entries(fields).map(([name, value]) => ({ name, value }))
      : [];
  for (const field of list) {
    if (field?.name !== FULFILMENT_FIELD) continue;
    if (typeof field.value === "string") return field.value;
    if (field.value && typeof field.value === "object" && "value" in field.value) {
      const value = (field.value as { value?: unknown }).value;
      if (typeof value === "string") return value;
    }
  }
  return null;
}

function basketSubtotal(): number | null {
  const cart = cartSnapshot();
  if (!cart) return null;
  if (typeof cart.subtotal === "number" && Number.isFinite(cart.subtotal)) return cart.subtotal;
  if (!Array.isArray(cart.items) || cart.items.length === 0) return null;
  let sum = 0;
  for (const item of cart.items) {
    const price = typeof item.price === "number" ? item.price : item.unitPrice;
    const quantity = typeof item.quantity === "number" ? item.quantity : 1;
    if (typeof price !== "number") return null;
    sum += price * quantity;
  }
  return sum;
}

function cartSnapshot(): CartSnapshot | null {
  const state = snipcartStore()?.getState() as { cart?: CartSnapshot } | CartSnapshot | undefined;
  if (!state || typeof state !== "object") return null;
  if ("cart" in state && state.cart && typeof state.cart === "object") return state.cart;
  if ("subtotal" in state || "items" in state) return state as CartSnapshot;
  return null;
}

function snipcartStore(): { getState: () => unknown; subscribe: (listener: () => void) => void } | null {
  const snipcart = (window as Window & {
    Snipcart?: { store?: { getState?: () => unknown; subscribe?: (listener: () => void) => void } };
  }).Snipcart;
  if (!snipcart?.store?.getState || !snipcart.store.subscribe) return null;
  return { getState: snipcart.store.getState, subscribe: snipcart.store.subscribe };
}

function showWarning(message: string): void {
  const warnings = [...document.querySelectorAll<HTMLElement>("[data-fulfilment-warning]")];
  if (warnings.length > 0) {
    for (const warning of warnings) {
      warning.hidden = false;
      warning.textContent = message;
      warning.setAttribute("role", "alert");
    }
    warnings[0]?.scrollIntoView({ block: "nearest" });
    return;
  }
  let banner = document.querySelector<HTMLElement>("[data-fulfilment-banner]");
  if (!banner) {
    banner = document.createElement("p");
    banner.dataset.fulfilmentBanner = "";
    banner.className = "fulfilment-warning";
    banner.setAttribute("role", "alert");
    const host = document.querySelector(".snipcart-layout__content") ?? document.body;
    host.prepend(banner);
  }
  banner.textContent = message;
}
