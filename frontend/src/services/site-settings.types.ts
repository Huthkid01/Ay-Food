export type SiteSettings = {
  maintenance_enabled: boolean;
  maintenance_message: string;
};

/** Shown to customers when maintenance mode is on (and used as the save fallback). */
export const DEFAULT_MAINTENANCE_MESSAGE =
  'We are closed today. Check back tomorrow.';
