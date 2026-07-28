export type SiteSettings = {
  maintenance_enabled: boolean;
  maintenance_message: string;
  /** NGN delivery fee at checkout when order type is Delivery. */
  delivery_fee: number;
  /** Distance-based fee rules from restaurant origin. */
  delivery_rules: unknown;
};

/** Shown to customers when maintenance mode is on (and used as the save fallback). */
export const DEFAULT_MAINTENANCE_MESSAGE =
  'We are closed today. Check back tomorrow.';

export const DEFAULT_DELIVERY_FEE = 1200;
