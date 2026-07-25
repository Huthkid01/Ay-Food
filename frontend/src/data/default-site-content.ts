import {
  HERO_IMAGE,
  HERO_INTERIOR_1,
  HERO_INTERIOR_2,
  type HeroSlide,
} from '../utils/food-images';

export type SiteFeature = {
  title: string;
  description: string;
};

export type SiteRestaurant = {
  brandPrefix: string;
  brandAccent: string;
  legalName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  /** Bank transfer payment details shown at checkout */
  bankName: string;
  accountName: string;
  accountNumber: string;
};

export type SiteHomeContent = {
  features: SiteFeature[];
  popularHeading: string;
  popularHighlight: string;
  popularSubheading: string;
  popularCtaLabel: string;
  popularCtaTo: string;
  ctaHeading: string;
  ctaBody: string;
  ctaButtonLabel: string;
  ctaButtonTo: string;
};

export type SitePageCopy = {
  title: string;
  titleHighlight: string;
  subtitle: string;
};

export type SiteBanner = {
  enabled: boolean;
  text: string;
};

export type SiteAbout = {
  title: string;
  paragraphs: string[];
};

export type SiteFaqItem = {
  question: string;
  answer: string;
};

export type SiteFaq = {
  title: string;
  items: SiteFaqItem[];
};

export type SiteSupportChannel = {
  title: string;
  description: string;
  href: string;
};

export type SiteSupport = {
  title: string;
  intro: string;
  channels: SiteSupportChannel[];
  refundPolicyButtonLabel: string;
};

export type SiteLegalSection = {
  title: string;
  body: string;
};

export type SiteTerms = {
  title: string;
  contactEmail: string;
  sections: SiteLegalSection[];
};

export type SiteRefund = {
  title: string;
  intro: string;
  rules: string[];
  supportLinkLabel: string;
  updateNote: string;
};

export type SiteContent = {
  restaurant: SiteRestaurant;
  heroSlides: HeroSlide[];
  home: SiteHomeContent;
  banner: SiteBanner;
  menuPage: SitePageCopy;
  buildPage: SitePageCopy;
  about: SiteAbout;
  faq: SiteFaq;
  support: SiteSupport;
  terms: SiteTerms;
  refund: SiteRefund;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  restaurant: {
    brandPrefix: 'Ay',
    brandAccent: 'Food',
    legalName: 'A.Y Food Mega Palace',
    tagline:
      'Build your perfect meal pack with authentic Nigerian cuisine. Located in Ogijo, Ikorodu — order online with delivery or pickup.',
    address: 'A.Y Food Mega Palace, Ogijo, Ikorodu, Lagos',
    phone: '+234 817 309 7933',
    email: 'contact@ayfoodpalace.com',
    hours: 'Mon–Sun · 9:00 AM – 10:00 PM',
    whatsapp: 'https://wa.me/2348173097933',
    instagram: '',
    facebook: '',
    bankName: 'OPay',
    accountName: 'AY FOOD MEGA PALACE',
    accountNumber: '6117812270',
  },
  heroSlides: [
    {
      image: HERO_IMAGE,
      tagline: 'Local food at its best',
      title: 'Ay',
      highlight: 'Food',
      description:
        'Build your perfect meal pack with authentic Nigerian cuisine. Choose your rice, swallow, soup, proteins and more — customized to your taste.',
      primaryCta: { label: 'Build Your Pack', to: '/build' },
      secondaryCta: { label: 'Browse Menu', to: '/menu' },
      imagePosition: '70% center',
    },
    {
      image: HERO_INTERIOR_1,
      tagline: 'Dine in with us',
      title: 'Vibrant Dining,',
      highlight: 'Authentic Flavours',
      description:
        'Enjoy fresh Nigerian meals in our colourful Ogijo restaurant — great food, great atmosphere, and a welcome you’ll feel the moment you walk in.',
      primaryCta: { label: 'Browse Menu', to: '/menu' },
      secondaryCta: { label: 'Build Your Pack', to: '/build' },
    },
    {
      image: HERO_INTERIOR_2,
      tagline: 'Ogijo · Ikorodu · Lagos',
      title: 'Order Hot Meals',
      highlight: 'To Your Door',
      description:
        'Same kitchen, same taste — delivered across Ogijo and Ikorodu. Browse the menu, add to cart, and checkout in minutes. No account needed.',
      primaryCta: { label: 'Start Ordering', to: '/menu' },
      secondaryCta: { label: 'Track Order', to: '/track' },
    },
  ],
  home: {
    features: [
      {
        title: 'Authentic Recipes',
        description: 'Traditional Yoruba cuisine made fresh daily',
      },
      {
        title: 'Fast Delivery',
        description: 'Hot meals delivered across Ogijo and Ikorodu',
      },
      {
        title: 'Secure Payment',
        description: 'Transfer to our account, then confirm on WhatsApp',
      },
    ],
    popularHeading: 'Popular',
    popularHighlight: 'Nigerian Dishes',
    popularSubheading: "Customer favorites you'll love",
    popularCtaLabel: 'View Full Menu',
    popularCtaTo: '/menu',
    ctaHeading: 'Ready to Order?',
    ctaBody: 'No account needed — browse, add to cart, and checkout in minutes.',
    ctaButtonLabel: 'Start Ordering',
    ctaButtonTo: '/menu',
  },
  banner: {
    enabled: true,
    text: 'Order now, pay now and get your meals delivered • Fresh Nigerian cuisine in Ogijo, Ikorodu • Order now, pay now and get your meals delivered',
  },
  menuPage: {
    title: 'Our',
    titleHighlight: 'Menu',
    subtitle: 'Browse authentic Nigerian meals and add dishes to your pack',
  },
  buildPage: {
    title: 'Build Your',
    titleHighlight: 'Pack',
    subtitle: 'Pick swallow, meals, protein, sides and soups — customize every meal',
  },
  about: {
    title: 'About Ay Food',
    paragraphs: [
      'A.Y Food Mega Palace serves authentic Nigerian cuisine in Ogijo, Ikorodu — from smoky jollof and swallow to pepper soup and fresh sides.',
      'Order online, build your custom meal pack, and enjoy delivery or pickup. No account needed.',
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    items: [
      {
        question: 'Do I need an account to order?',
        answer: 'No. Browse the menu, add items to your pack, and checkout as a guest.',
      },
      {
        question: 'Which areas do you deliver to?',
        answer: 'We deliver across Ogijo and Ikorodu. Call us if you are unsure about your location.',
      },
      {
        question: 'How can I track my order?',
        answer: 'Use the Track Order page with your order number after checkout.',
      },
    ],
  },
  support: {
    title: 'Support',
    intro: 'Need help with an order or the menu? Reach us through any channel below.',
    channels: [
      {
        title: 'Phone',
        description: 'Call the kitchen during opening hours',
        href: 'tel:+2348173097933',
      },
      {
        title: 'WhatsApp',
        description: 'Chat with us for quick questions',
        href: 'https://wa.me/2348173097933',
      },
      {
        title: 'Email',
        description: 'Send order details or feedback',
        href: 'mailto:contact@ayfoodpalace.com',
      },
    ],
    refundPolicyButtonLabel: 'View Refund Policy',
  },
  terms: {
    title: 'Terms & Conditions',
    contactEmail: 'contact@ayfoodpalace.com',
    sections: [
      {
        title: 'Orders',
        body: 'Placing an order means you agree to pay the listed prices and any delivery fees shown at checkout.',
      },
      {
        title: 'Food preparation',
        body: 'Meals are prepared fresh. Please note any allergies in the order notes when available.',
      },
      {
        title: 'Contact',
        body: 'For questions about these terms, email us at the address listed on this page.',
      },
    ],
  },
  refund: {
    title: 'Refund Policy',
    intro: 'We want every meal to arrive hot and correct. If something goes wrong, here is how we handle refunds.',
    rules: [
      'Report missing or wrong items within 1 hour of delivery with your order number.',
      'Refunds for confirmed kitchen errors are processed to your original payment method.',
      'Taste preference alone is not grounds for a full refund once the meal has been prepared.',
    ],
    supportLinkLabel: 'Contact Support',
    updateNote: 'Policy last reviewed for A.Y Food Mega Palace operations in Ogijo.',
  },
};

export function brandDisplayName(r: SiteRestaurant): string {
  return `${r.brandPrefix} ${r.brandAccent}`.trim();
}
