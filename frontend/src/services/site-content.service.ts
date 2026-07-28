import {
  DEFAULT_SITE_CONTENT,
  type SiteContent,
} from '../data/default-site-content';
import type { HeroSlide } from '../utils/food-images';
import { normalizeHeroImage } from '../utils/food-images';

export type { SiteContent };
export { DEFAULT_SITE_CONTENT, brandDisplayName } from '../data/default-site-content';

const LOCAL_CONTENT_KEY = 'ay-food-site-content';
const CONTENT_EVENT = 'ay-food-site-content-changed';
const CONTENT_CHANNEL = 'ay-food-site-content';
/** Bump to push official bank + WhatsApp + brand into existing local drafts once. */
const CONTACT_SEED_KEY = 'ay-food-contact-seed';
const CONTACT_SEED_VERSION = 'hours-closed-friday-8am-v1';

export const SITE_CONTENT_KEY = ['site-content'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeHeroSlide(base: HeroSlide, patch: unknown): HeroSlide {
  if (!isRecord(patch)) return normalizeHeroBrandTitle(base);
  const primary = isRecord(patch.primaryCta) ? patch.primaryCta : {};
  const secondary = isRecord(patch.secondaryCta) ? patch.secondaryCta : {};
  return normalizeHeroBrandTitle({
    image:
      typeof patch.image === 'string' && patch.image
        ? normalizeHeroImage(patch.image)
        : normalizeHeroImage(base.image),
    tagline: typeof patch.tagline === 'string' ? patch.tagline : base.tagline,
    title: typeof patch.title === 'string' ? patch.title : base.title,
    highlight: typeof patch.highlight === 'string' ? patch.highlight : base.highlight,
    description: typeof patch.description === 'string' ? patch.description : base.description,
    primaryCta: {
      label:
        typeof primary.label === 'string' ? primary.label : base.primaryCta.label,
      to: typeof primary.to === 'string' ? primary.to : base.primaryCta.to,
    },
    secondaryCta: {
      label:
        typeof secondary.label === 'string' ? secondary.label : base.secondaryCta.label,
      to: typeof secondary.to === 'string' ? secondary.to : base.secondaryCta.to,
    },
    imagePosition:
      typeof patch.imagePosition === 'string' ? patch.imagePosition : base.imagePosition,
    active: typeof patch.active === 'boolean' ? patch.active : (base.active ?? true),
  });
}

/** Welcome hero: white “Welcome to” + gold “Ay Food Palace” (matches other slides). */
function normalizeHeroBrandTitle(slide: HeroSlide): HeroSlide {
  const title = slide.title.trim();
  const highlight = (slide.highlight ?? '').trim();
  const combined = [title, highlight]
    .filter(Boolean)
    .join(' ')
    .replace(/[.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const isBrandOnly =
    combined === 'ay food' ||
    combined === 'ayfood' ||
    combined === 'ay' ||
    combined === 'ay food palace' ||
    combined === 'welcome to ay food palace';

  if (isBrandOnly) {
    return { ...slide, title: 'Welcome to', highlight: 'Ay Food Palace' };
  }

  if (
    !highlight &&
    (title.toLowerCase() === 'ay food palace' ||
      title.toLowerCase() === 'welcome to ay food palace')
  ) {
    return { ...slide, title: 'Welcome to', highlight: 'Ay Food Palace' };
  }

  return slide;
}

function normalizeRestaurantBrand(
  restaurant: SiteContent['restaurant'],
): SiteContent['restaurant'] {
  const prefix = restaurant.brandPrefix.trim();
  const accent = restaurant.brandAccent.trim();
  const combined = `${prefix} ${accent}`.replace(/\s+/g, ' ').trim();
  if (
    (prefix === 'Ay' && accent === 'Food') ||
    combined === 'Ay Food' ||
    combined === 'Ay'
  ) {
    return {
      ...restaurant,
      brandPrefix: DEFAULT_SITE_CONTENT.restaurant.brandPrefix,
      brandAccent: DEFAULT_SITE_CONTENT.restaurant.brandAccent,
    };
  }
  return restaurant;
}

/** Deep-merge saved content onto defaults so new fields always exist. */
export function normalizeSiteContent(raw: unknown): SiteContent {
  const input = isRecord(raw) ? raw : {};
  const restaurantIn = isRecord(input.restaurant) ? input.restaurant : {};
  const homeIn = isRecord(input.home) ? input.home : {};
  const bannerIn = isRecord(input.banner) ? input.banner : {};
  const menuIn = isRecord(input.menuPage) ? input.menuPage : {};
  const buildIn = isRecord(input.buildPage) ? input.buildPage : {};

  const featuresRaw = Array.isArray(homeIn.features)
    ? homeIn.features
    : DEFAULT_SITE_CONTENT.home.features;

  const features = DEFAULT_SITE_CONTENT.home.features.map((base, i) => {
    const patch = featuresRaw[i];
    if (!isRecord(patch)) return base;
    return {
      title: typeof patch.title === 'string' ? patch.title : base.title,
      description:
        typeof patch.description === 'string' ? patch.description : base.description,
    };
  });

  const slidesRaw = Array.isArray(input.heroSlides)
    ? input.heroSlides
    : DEFAULT_SITE_CONTENT.heroSlides;

  const heroSlides: HeroSlide[] =
    slidesRaw.length > 0
      ? slidesRaw.map((slide, i) =>
          mergeHeroSlide(
            DEFAULT_SITE_CONTENT.heroSlides[i] ?? DEFAULT_SITE_CONTENT.heroSlides[0],
            slide
          )
        )
      : DEFAULT_SITE_CONTENT.heroSlides;

  return {
    restaurant: normalizeRestaurantBrand({
      ...DEFAULT_SITE_CONTENT.restaurant,
      ...Object.fromEntries(
        Object.entries(restaurantIn).filter(([, v]) => typeof v === 'string')
      ),
    }),
    heroSlides,
    home: {
      ...DEFAULT_SITE_CONTENT.home,
      features,
      popularHeading:
        typeof homeIn.popularHeading === 'string'
          ? homeIn.popularHeading
          : DEFAULT_SITE_CONTENT.home.popularHeading,
      popularHighlight:
        typeof homeIn.popularHighlight === 'string'
          ? homeIn.popularHighlight
          : DEFAULT_SITE_CONTENT.home.popularHighlight,
      popularSubheading:
        typeof homeIn.popularSubheading === 'string'
          ? homeIn.popularSubheading
          : DEFAULT_SITE_CONTENT.home.popularSubheading,
      popularCtaLabel:
        typeof homeIn.popularCtaLabel === 'string'
          ? homeIn.popularCtaLabel
          : DEFAULT_SITE_CONTENT.home.popularCtaLabel,
      popularCtaTo:
        typeof homeIn.popularCtaTo === 'string'
          ? homeIn.popularCtaTo
          : DEFAULT_SITE_CONTENT.home.popularCtaTo,
      ctaHeading:
        typeof homeIn.ctaHeading === 'string'
          ? homeIn.ctaHeading
          : DEFAULT_SITE_CONTENT.home.ctaHeading,
      ctaBody:
        typeof homeIn.ctaBody === 'string' ? homeIn.ctaBody : DEFAULT_SITE_CONTENT.home.ctaBody,
      ctaButtonLabel:
        typeof homeIn.ctaButtonLabel === 'string'
          ? homeIn.ctaButtonLabel
          : DEFAULT_SITE_CONTENT.home.ctaButtonLabel,
      ctaButtonTo:
        typeof homeIn.ctaButtonTo === 'string'
          ? homeIn.ctaButtonTo
          : DEFAULT_SITE_CONTENT.home.ctaButtonTo,
    },
    banner: {
      enabled:
        typeof bannerIn.enabled === 'boolean'
          ? bannerIn.enabled
          : DEFAULT_SITE_CONTENT.banner.enabled,
      text:
        typeof bannerIn.text === 'string' ? bannerIn.text : DEFAULT_SITE_CONTENT.banner.text,
    },
    menuPage: {
      ...DEFAULT_SITE_CONTENT.menuPage,
      ...Object.fromEntries(
        Object.entries(menuIn).filter(([, v]) => typeof v === 'string')
      ),
    },
    buildPage: {
      ...DEFAULT_SITE_CONTENT.buildPage,
      ...Object.fromEntries(
        Object.entries(buildIn).filter(([, v]) => typeof v === 'string')
      ),
    },
    about: mergeAbout(input.about),
    faq: mergeFaq(input.faq),
    support: mergeSupport(input.support),
    terms: mergeTerms(input.terms),
    refund: mergeRefund(input.refund),
  };
}

function mergeAbout(raw: unknown): SiteContent['about'] {
  const base = DEFAULT_SITE_CONTENT.about;
  if (!isRecord(raw)) return base;
  const paragraphs = Array.isArray(raw.paragraphs)
    ? raw.paragraphs.filter((p): p is string => typeof p === 'string')
    : base.paragraphs;
  return {
    title: typeof raw.title === 'string' ? raw.title : base.title,
    paragraphs: paragraphs.length > 0 ? paragraphs : base.paragraphs,
  };
}

function mergeFaq(raw: unknown): SiteContent['faq'] {
  const base = DEFAULT_SITE_CONTENT.faq;
  if (!isRecord(raw)) return base;
  const itemsRaw = Array.isArray(raw.items) ? raw.items : base.items;
  const items = itemsRaw
    .map((item, i) => {
      const fallback = base.items[i] ?? { question: '', answer: '' };
      if (!isRecord(item)) return fallback;
      return {
        question: typeof item.question === 'string' ? item.question : fallback.question,
        answer: typeof item.answer === 'string' ? item.answer : fallback.answer,
      };
    })
    .filter((item) => item.question.trim() || item.answer.trim());
  return {
    title: typeof raw.title === 'string' ? raw.title : base.title,
    items: items.length > 0 ? items : base.items,
  };
}

function mergeSupport(raw: unknown): SiteContent['support'] {
  const base = DEFAULT_SITE_CONTENT.support;
  if (!isRecord(raw)) return base;
  const channelsRaw = Array.isArray(raw.channels) ? raw.channels : base.channels;
  const channels = channelsRaw.map((ch, i) => {
    const fallback = base.channels[i] ?? { title: '', description: '', href: '' };
    if (!isRecord(ch)) return fallback;
    return {
      title: typeof ch.title === 'string' ? ch.title : fallback.title,
      description: typeof ch.description === 'string' ? ch.description : fallback.description,
      href: typeof ch.href === 'string' ? ch.href : fallback.href,
    };
  });
  return {
    title: typeof raw.title === 'string' ? raw.title : base.title,
    intro: typeof raw.intro === 'string' ? raw.intro : base.intro,
    refundPolicyButtonLabel:
      typeof raw.refundPolicyButtonLabel === 'string'
        ? raw.refundPolicyButtonLabel
        : base.refundPolicyButtonLabel,
    channels: channels.length > 0 ? channels : base.channels,
  };
}

function mergeTerms(raw: unknown): SiteContent['terms'] {
  const base = DEFAULT_SITE_CONTENT.terms;
  if (!isRecord(raw)) return base;
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : base.sections;
  const sections = sectionsRaw.map((sec, i) => {
    const fallback = base.sections[i] ?? { title: '', body: '' };
    if (!isRecord(sec)) return fallback;
    return {
      title: typeof sec.title === 'string' ? sec.title : fallback.title,
      body: typeof sec.body === 'string' ? sec.body : fallback.body,
    };
  });
  return {
    title: typeof raw.title === 'string' ? raw.title : base.title,
    contactEmail: typeof raw.contactEmail === 'string' ? raw.contactEmail : base.contactEmail,
    sections: sections.length > 0 ? sections : base.sections,
  };
}

function mergeRefund(raw: unknown): SiteContent['refund'] {
  const base = DEFAULT_SITE_CONTENT.refund;
  if (!isRecord(raw)) return base;
  const rules = Array.isArray(raw.rules)
    ? raw.rules.filter((r): r is string => typeof r === 'string')
    : base.rules;
  return {
    title: typeof raw.title === 'string' ? raw.title : base.title,
    intro: typeof raw.intro === 'string' ? raw.intro : base.intro,
    rules: rules.length > 0 ? rules : base.rules,
    supportLinkLabel:
      typeof raw.supportLinkLabel === 'string' ? raw.supportLinkLabel : base.supportLinkLabel,
    updateNote: typeof raw.updateNote === 'string' ? raw.updateNote : base.updateNote,
  };
}

function readLocal(): SiteContent | null {
  try {
    const raw = localStorage.getItem(LOCAL_CONTENT_KEY);
    if (!raw) return null;
    return normalizeSiteContent(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocal(content: SiteContent) {
  localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(content));
}

/** One-time overwrite of payment + WhatsApp contact from official defaults. */
function applyOfficialContactSeed(content: SiteContent): SiteContent {
  try {
    if (localStorage.getItem(CONTACT_SEED_KEY) === CONTACT_SEED_VERSION) {
      return content;
    }
    const next: SiteContent = {
      ...content,
      restaurant: normalizeRestaurantBrand({
        ...content.restaurant,
        brandPrefix: DEFAULT_SITE_CONTENT.restaurant.brandPrefix,
        brandAccent: DEFAULT_SITE_CONTENT.restaurant.brandAccent,
        phone: DEFAULT_SITE_CONTENT.restaurant.phone,
        whatsapp: DEFAULT_SITE_CONTENT.restaurant.whatsapp,
        hours: DEFAULT_SITE_CONTENT.restaurant.hours,
        bankName: DEFAULT_SITE_CONTENT.restaurant.bankName,
        accountName: DEFAULT_SITE_CONTENT.restaurant.accountName,
        accountNumber: DEFAULT_SITE_CONTENT.restaurant.accountNumber,
      }),
      heroSlides: content.heroSlides.map(normalizeHeroBrandTitle),
      support: {
        ...content.support,
        channels: content.support.channels.map((ch) => {
          if (ch.title === 'Phone') {
            return { ...ch, href: DEFAULT_SITE_CONTENT.support.channels[0].href };
          }
          if (ch.title === 'WhatsApp') {
            return { ...ch, href: DEFAULT_SITE_CONTENT.support.channels[1].href };
          }
          return ch;
        }),
      },
    };
    writeLocal(next);
    localStorage.setItem(CONTACT_SEED_KEY, CONTACT_SEED_VERSION);
    return next;
  } catch {
    return content;
  }
}

export function notifySiteContentChanged() {
  try {
    window.dispatchEvent(new Event(CONTENT_EVENT));
    localStorage.setItem('ay-food-site-content-bump', String(Date.now()));
    const channel = new BroadcastChannel(CONTENT_CHANNEL);
    channel.postMessage('changed');
    channel.close();
  } catch {
    // ignore
  }
}

export function subscribeSiteContentChanged(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(CONTENT_EVENT, handler);
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'ay-food-site-content-bump' || e.key === LOCAL_CONTENT_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CONTENT_CHANNEL);
    channel.onmessage = () => onChange();
  } catch {
    // ignore
  }
  return () => {
    window.removeEventListener(CONTENT_EVENT, handler);
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}

export const siteContentService = {
  async get(): Promise<SiteContent> {
    const { isSupabaseConfigured, supabase } = await import('../lib/supabase');
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('site_settings')
        .select('content')
        .eq('id', 'main')
        .maybeSingle();
      if (!error && data?.content) {
        const normalized = applyOfficialContactSeed(normalizeSiteContent(data.content));
        writeLocal(normalized);
        return normalized;
      }
    }

    const local = readLocal();
    if (local) return applyOfficialContactSeed(local);
    return applyOfficialContactSeed(DEFAULT_SITE_CONTENT);
  },

  async update(next: SiteContent): Promise<SiteContent> {
    const normalized = normalizeSiteContent(next);

    const { isSupabaseConfigured } = await import('../lib/supabase');
    if (isSupabaseConfigured()) {
      const { adminRpc } = await import('../lib/admin-rpc');
      await adminRpc('admin_update_site_content', {
        p_content: normalized,
      });
    }

    writeLocal(normalized);
    notifySiteContentChanged();
    return normalized;
  },

  async reset(): Promise<SiteContent> {
    return this.update(DEFAULT_SITE_CONTENT);
  },
};
