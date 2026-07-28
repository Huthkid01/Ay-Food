/** Persist checkout contact / delivery fields while shopping (localStorage). */

const CHECKOUT_DRAFT_KEY = 'ay-food-checkout-draft';

export type CheckoutDraftForm = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderType?: 'DELIVERY' | 'PICKUP';
  deliveryAddress?: string;
  deliveryInstructions?: string;
};

export type CheckoutDraftPoint = {
  lat: number;
  lon: number;
  city?: string | null;
  state?: string | null;
  landmark?: string | null;
};

export type CheckoutDraft = {
  form: CheckoutDraftForm;
  deliveryPoint?: CheckoutDraftPoint | null;
  mapsUrl?: string | null;
};

export function readCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (!parsed || typeof parsed !== 'object' || !parsed.form) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  try {
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

export function clearCheckoutDraft(): void {
  try {
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // ignore
  }
}
