import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'https://www.ayfoodpalace.com';
const DEFAULT_TITLE =
  'Ay Food | A.Y Food Mega Palace & A.Y Food Palace — Order Online | Ogijo';
const DEFAULT_DESC =
  'Order from Ay Food (A.Y Food Mega Palace / A.Y Food Palace) in Ogijo — authentic Nigerian meals for delivery & pickup. Also known as Ay Mega Food Palace. Omoleye, Ikorodu–Shagamu Road.';

type SeoEntry = { title: string; description: string; noindex?: boolean };

const SEO_BY_PATH: Record<string, SeoEntry> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
  },
  '/menu': {
    title: 'Menu — Ay Food Palace | A.Y Food Mega Palace Nigerian Dishes',
    description:
      'Browse the Ay Food (A.Y Food Mega Palace) menu — jollof, swallow, soups, proteins and sides. Order online for delivery or pickup in Ogijo.',
  },
  '/build': {
    title: 'Build Your Pack — Ay Food | A.Y Food Mega Palace',
    description:
      'Customize your meal pack at Ay Food Palace — swallow, meals, protein, sides and soups. Order from A.Y Food Mega Palace in Ogijo.',
  },
  '/cart': {
    title: 'Your Cart — Ay Food',
    description: 'Review your Ay Food meal pack before checkout.',
    noindex: true,
  },
  '/checkout': {
    title: 'Checkout — Ay Food',
    description: 'Complete your Ay Food order for delivery or pickup in Ogijo.',
    noindex: true,
  },
  '/track': {
    title: 'Track Order — Ay Food Palace | A.Y Food Mega Palace',
    description: 'Track your Ay Food / A.Y Food Mega Palace order with your order number.',
  },
  '/about': {
    title: 'About Ay Food | A.Y Food Mega Palace & A.Y Food Palace | Ogijo',
    description:
      'About Ay Food (A.Y Food Mega Palace), also listed as A.Y Food Palace on Google Maps. Visit Omoleye, Ogijo 121101. Order Nigerian meals online.',
  },
  '/faq': {
    title: 'FAQ — Ay Food Palace | A.Y Food Mega Palace',
    description:
      'FAQ for Ay Food / A.Y Food Mega Palace — ordering, delivery, pickup, and payment in Ogijo.',
  },
  '/support': {
    title: 'Contact Ay Food Palace | A.Y Food Mega Palace Support',
    description:
      'Contact Ay Food (A.Y Food Mega Palace / A.Y Food Palace) — phone, WhatsApp, and email. Omoleye, Ogijo.',
  },
  '/terms': {
    title: 'Terms & Conditions — Ay Food Mega Palace',
    description: 'Terms and conditions for ordering from Ay Food / A.Y Food Mega Palace.',
  },
  '/refund': {
    title: 'Refund Policy — Ay Food Mega Palace',
    description: 'Refund and order policy for Ay Food / A.Y Food Mega Palace.',
  },
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Per-route SEO for public pages. Admin routes are noindex. */
export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdmin = pathname.startsWith('/admin') || pathname === '/login';
    const entry = isAdmin
      ? {
          title: 'Admin — Ay Food',
          description: 'Ay Food admin panel',
          noindex: true,
        }
      : (SEO_BY_PATH[pathname] ?? {
          title: DEFAULT_TITLE,
          description: DEFAULT_DESC,
        });

    document.title = entry.title;
    upsertMeta('name', 'description', entry.description);
    upsertMeta('name', 'robots', entry.noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:title', entry.title);
    upsertMeta('property', 'og:description', entry.description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', `${SITE}${pathname === '/' ? '' : pathname}`);
    upsertMeta('property', 'og:site_name', 'Ay Food Mega Palace');
    upsertMeta('property', 'og:image', `${SITE}/assets/hero.png`);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', entry.title);
    upsertMeta('name', 'twitter:description', entry.description);
    upsertMeta('name', 'twitter:image', `${SITE}/assets/hero.png`);
    upsertLink('canonical', `${SITE}${pathname === '/' ? '/' : pathname}`);
  }, [pathname]);

  return null;
}
