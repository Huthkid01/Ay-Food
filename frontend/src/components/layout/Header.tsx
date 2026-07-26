import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../../contexts/CartContext';
import { useSiteContentData } from '../../hooks/useSiteContent';
import { BrandLogo } from '../ui/BrandLogo';
import { cn } from '../../utils/helpers';

const primaryLinks = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/build', label: 'Build Pack' },
  { to: '/track', label: 'Track' },
  { to: '/about', label: 'About' },
];

const secondaryLinks = [
  { to: '/faq', label: 'FAQ' },
  { to: '/support', label: 'Support' },
  { to: '/terms', label: 'Terms' },
  { to: '/refund', label: 'Refund' },
];

/** Full labels for the mobile drawer */
const mobileNavLinks = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/build', label: 'Build Pack' },
  { to: '/track', label: 'Track Order' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/support', label: 'Support' },
  { to: '/terms', label: 'Terms' },
  { to: '/refund', label: 'Refund Policy' },
];

function BrandMark({ className }: { className?: string }) {
  return <BrandLogo className={className} size="sm" tone="dark" />;
}

function NavLink({
  to,
  label,
  active,
  muted,
}: {
  to: string;
  label: string;
  active: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors xl:px-3 xl:text-sm',
        active
          ? 'text-brand-gold'
          : muted
            ? 'text-white/50 hover:text-brand-gold'
            : 'text-white/80 hover:text-brand-gold',
      )}
    >
      {label}
      <span
        className={cn(
          'absolute inset-x-2.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand-gold transition-transform duration-300 xl:inset-x-3',
          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
        )}
      />
    </Link>
  );
}

export function Header() {
  const { itemCount } = useCart();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const drawer =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <div
                className="fixed inset-0 z-[200] lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                data-testid="mobile-nav-drawer"
              >
                <motion.button
                  type="button"
                  aria-label="Close menu"
                  className="absolute inset-0 bg-black/70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setMobileOpen(false)}
                />
                <motion.nav
                  className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col bg-[#111111] shadow-2xl"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  data-testid="mobile-nav-panel"
                >
                  <div className="flex items-center justify-between border-b border-brand-subtle px-4 py-4">
                    <BrandMark className="text-xl" />
                    <button
                      type="button"
                      className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-brand-gold"
                      onClick={() => setMobileOpen(false)}
                      aria-label="Close menu"
                      data-testid="mobile-nav-close"
                    >
                      <X size={22} />
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
                    {mobileNavLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        data-testid={`mobile-nav-${link.to === '/' ? 'home' : link.to.slice(1)}`}
                        className={cn(
                          'rounded-2xl px-4 py-3.5 text-base font-medium transition',
                          location.pathname === link.to
                            ? 'bg-brand-gold/15 text-brand-gold'
                            : 'text-white hover:bg-white/5 hover:text-brand-gold',
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-brand-subtle p-4">
                    <Link
                      to="/menu"
                      className="btn-primary btn-ripple w-full py-3 text-sm"
                      onClick={() => setMobileOpen(false)}
                    >
                      Order Now
                    </Link>
                  </div>
                </motion.nav>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-all duration-300',
        scrolled
          ? 'border-brand-subtle bg-brand-dark/90 shadow-[0_8px_30px_rgb(0_0_0/0.35)] backdrop-blur-xl'
          : 'border-transparent bg-brand-dark/80 backdrop-blur-md',
      )}
    >
      <div className="site-container flex items-center justify-between gap-3 py-3.5">
        <Link to="/" className="min-w-0 shrink-0">
          <BrandMark />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-0.5 lg:flex xl:gap-1">
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              label={link.label}
              active={location.pathname === link.to}
            />
          ))}
          <span className="mx-1 hidden h-4 w-px bg-white/10 xl:inline-block" aria-hidden />
          {secondaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              label={link.label}
              active={location.pathname === link.to}
              muted
            />
          ))}
          <Link
            to="/cart"
            className="relative ml-2 shrink-0 rounded-full p-2.5 text-white/70 transition hover:bg-white/10 hover:text-brand-gold"
            aria-label="Cart"
          >
            <ShoppingBag size={18} className="xl:h-5 xl:w-5" />
            <AnimatePresence>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-white"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </nav>

        <div className="flex items-center gap-1 lg:hidden">
          <Link
            to="/cart"
            className="relative rounded-full p-2 text-white/70 transition hover:text-brand-gold"
            aria-label="Cart"
          >
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1 text-xs font-bold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="rounded-full p-2 transition hover:bg-white/10"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            data-testid="mobile-nav-open"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {drawer}
    </header>
  );
}

export function Footer() {
  const { restaurant } = useSiteContentData();
  const phoneHref = restaurant.phone.replace(/[^\d+]/g, '');

  return (
    <footer className="border-t border-brand-subtle bg-brand-dark-light">
      <div className="site-container py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-secondary">
              {restaurant.tagline}
            </p>
          </div>
          <div>
            <h3 className="mb-4 font-display text-lg font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-secondary">
              <li>
                <Link to="/menu" className="transition hover:text-brand-gold">
                  Browse Menu
                </Link>
              </li>
              <li>
                <Link to="/build" className="transition hover:text-brand-gold">
                  Build Your Pack
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition hover:text-brand-gold">
                  About
                </Link>
              </li>
              <li>
                <Link to="/faq" className="transition hover:text-brand-gold">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/support" className="transition hover:text-brand-gold">
                  Support
                </Link>
              </li>
              <li>
                <Link to="/terms" className="transition hover:text-brand-gold">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/refund" className="transition hover:text-brand-gold">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-display text-lg font-semibold text-white">Contact</h3>
            <ul className="space-y-2.5 text-sm text-secondary">
              <li>{restaurant.address}</li>
              {restaurant.hours && <li>{restaurant.hours}</li>}
              <li>
                <a href={`tel:${phoneHref}`} className="transition hover:text-brand-gold">
                  {restaurant.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${restaurant.email}`} className="transition hover:text-brand-gold">
                  {restaurant.email}
                </a>
              </li>
              {(restaurant.whatsapp || restaurant.instagram || restaurant.facebook) && (
                <li className="flex flex-wrap gap-3 pt-1">
                  {restaurant.whatsapp && (
                    <a
                      href={restaurant.whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-brand-gold"
                    >
                      WhatsApp
                    </a>
                  )}
                  {restaurant.instagram && (
                    <a
                      href={restaurant.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-brand-gold"
                    >
                      Instagram
                    </a>
                  )}
                  {restaurant.facebook && (
                    <a
                      href={restaurant.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-brand-gold"
                    >
                      Facebook
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-brand-subtle pt-6 text-center text-sm text-muted">
          © {new Date().getFullYear()} {restaurant.brandPrefix} {restaurant.brandAccent}. All
          rights reserved.
        </div>
      </div>
    </footer>
  );
}
