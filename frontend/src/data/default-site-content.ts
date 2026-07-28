import { type HeroSlide } from '../utils/food-images';

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
    brandPrefix: 'Ay Food',
    brandAccent: 'Palace',
    legalName: 'A.Y Food Mega Palace',
    tagline:
      'Build your perfect meal pack with authentic Nigerian cuisine. Located in Ogijo, Ikorodu — order online with delivery or pickup.',
    address: 'Omoleye bustop, Ogijo, Ikorodu–Shagamu Road',
    phone: '+234 817 309 7933',
    email: 'contact@ayfoodpalace.com',
    hours: 'Mon–Thu, Sat–Sun · 8:00 AM – 10:00 PM (Closed Fridays)',
    whatsapp: 'https://wa.me/2348173097933',
    instagram: '',
    facebook: '',
    bankName: 'OPay',
    accountName: 'AY FOOD MEGA PALACE',
    accountNumber: '6117812270',
  },
  heroSlides: [
    {
      image: '/assets/hero-restaurant.webp',
      tagline: 'Real restaurant · Ogijo',
      title: 'Authentic Nigerian Dining',
      highlight: 'in Ogijo',
      description:
        'Visit our beautiful restaurant or order fresh Nigerian meals online for fast delivery and pickup.',
      primaryCta: { label: 'Order Now', to: '/menu' },
      secondaryCta: { label: 'Browse Menu', to: '/menu' },
      imagePosition: 'center 30%',
    },
    {
      image: '/assets/hero-signature.webp',
      tagline: 'Signature kitchen',
      title: 'Freshly Cooked.',
      highlight: 'Delivered Hot.',
      description:
        'Every meal is prepared fresh using quality ingredients and authentic Nigerian recipes.',
      primaryCta: { label: 'Order Now', to: '/menu' },
      secondaryCta: { label: 'Build Your Pack', to: '/build' },
      imagePosition: 'center',
    },
    {
      image: '/assets/hero-variety-alt.webp',
      tagline: 'Full menu',
      title: 'Something Delicious',
      highlight: 'For Everyone',
      description:
        'Browse our full menu and discover authentic Nigerian meals made fresh every day.',
      primaryCta: { label: 'Explore Menu', to: '/menu' },
      secondaryCta: { label: 'Order Now', to: '/menu' },
      imagePosition: 'center',
    },
  ],
  home: {
    features: [
      {
        title: 'Fresh Daily',
        description: 'Nigerian dishes prepared fresh from our Ogijo kitchen every day',
      },
      {
        title: 'Fast Delivery',
        description: 'Hot meals typically arrive in 30–45 minutes across Ogijo & Ikorodu',
      },
      {
        title: 'Secure Payment',
        description: 'Pay securely with Kora (card or bank) — get email confirmation and tracking',
      },
    ],
    popularHeading: 'Popular',
    popularHighlight: 'Nigerian Dishes',
    popularSubheading: 'Customer favorites from our Ogijo kitchen',
    popularCtaLabel: 'View Full Menu',
    popularCtaTo: '/menu',
    ctaHeading: 'Hungry? Order in minutes.',
    ctaBody: 'No account needed — browse, add to cart, and checkout.',
    ctaButtonLabel: 'Order Now',
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
      'A.Y Food Mega Palace — also known as Ay Food, A.Y Food Palace, and Ay Mega Food Palace — is a Nigerian restaurant in Ogijo serving authentic Yoruba and Nigerian meals. Find us on Google Maps as A.Y Food Palace at Omoleye (Omoleye Clinic area).',
      'A.Y Food Mega Palace in Ogijo is built around custom meal packs. Choose your swallow (Amala, Eba, Semo, or Pounded Yam), pair it with soups like Ewedu, Gbegiri, Egusi, Okro, or Efo Riro, and add the protein you want — goat meat, beef, chicken, turkey, fish, and more.',
      'Our meals also include Jollof Rice, Fried Rice, Ofada Rice, Special Rice, beans, spaghetti, and yam dishes, plus sides like plantain, moi moi, and salad. Order online at ayfoodpalace.com, build your pack, and enjoy delivery or pickup — no account needed.',
      'Find us at Omoleye bustop, Ogijo, along the Ikorodu–Shagamu Road (Ogijo 121101, Ogun State). We look forward to welcoming you.',
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
  const name = `${r.brandPrefix} ${r.brandAccent}`.replace(/\s+/g, ' ').trim();
  // Legacy CMS stored “Ay” + “Food” — always show full brand.
  if (name === 'Ay Food' || name === 'Ay') return 'Ay Food Palace';
  return name;
}
