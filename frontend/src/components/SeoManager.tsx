import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'https://www.ayfoodpalace.com';
const DEFAULT_TITLE = 'Ay Food — Order Nigerian Meals Online | Ogijo, Ikorodu';
const DEFAULT_DESC =
  'A.Y Food Mega Palace — authentic Nigerian cuisine in Ogijo, Ikorodu. Build your meal pack, order online for delivery or pickup. Omoleye bustop, Ikorodu–Shagamu Road.';

type SeoEntry = { title: string; description: string; noindex?: boolean };

const SEO_BY_PATH: Record<string, SeoEntry> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
  },
  '/menu': {
    title: 'Menu — Ay Food Mega Palace | Nigerian Dishes',
    description:
      'Browse jollof, swallow, soups, proteins and sides from A.Y Food Mega Palace. Order online for delivery or pickup in Ogijo, Ikorodu.',
  },
  '/build': {
    title: 'Build Your Pack — Ay Food Mega Palace',
    description:
      'Customize your Nigerian meal pack — swallow, meals, protein, sides and soups. Order from Ay Food in Ogijo, Ikorodu.',
  },
  '/cart': {
    title: 'Your Cart — Ay Food',
    description: 'Review your Ay Food meal pack before checkout.',
  },
  '/checkout': {
    title: 'Checkout — Ay Food',
    description: 'Complete your Ay Food order for delivery or pickup in Ogijo, Ikorodu.',
  },
  '/track': {
    title: 'Track Order — Ay Food',
    description: 'Track your Ay Food Mega Palace order with your order number.',
  },
  '/about': {
    title: 'About Us — Ay Food Mega Palace | Ogijo, Ikorodu',
    description:
      'Learn about A.Y Food Mega Palace. Visit us at Omoleye bustop, Ogijo, Ikorodu–Shagamu Road, Lagos.',
  },
  '/faq': {
    title: 'FAQ — Ay Food Mega Palace',
    description: 'Frequently asked questions about ordering, delivery, and pickup at Ay Food.',
  },
  '/support': {
    title: 'Support — Ay Food Mega Palace',
    description: 'Contact Ay Food for order help, WhatsApp, phone, or email support.',
  },
  '/terms': {
    title: 'Terms & Conditions — Ay Food',
    description: 'Terms and conditions for ordering from A.Y Food Mega Palace.',
  },
  '/refund': {
    title: 'Refund Policy — Ay Food',
    description: 'Refund and order policy for A.Y Food Mega Palace.',
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
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', entry.title);
    upsertMeta('name', 'twitter:description', entry.description);
    upsertLink('canonical', `${SITE}${pathname === '/' ? '/' : pathname}`);
  }, [pathname]);

  return null;
}
