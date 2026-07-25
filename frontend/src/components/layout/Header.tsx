import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../../contexts/CartContext';
import { useSiteContentData } from '../../hooks/useSiteContent';
import { cn } from '../../utils/helpers';

const navLinks = [
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
  const { restaurant } = useSiteContentData();
  return (
    <span className={cn('font-display text-2xl font-bold tracking-tight', className)}>
      {restaurant.brandPrefix}{' '}
      <span className="text-gradient">{restaurant.brandAccent}</span>
    </span>
  );
}

export function Header() {
  const { itemCount } = useCart();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

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
                className="fixed inset-0 z-[200] md:hidden"
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
                  className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col bg-[#0C0C0C] shadow-2xl"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  data-testid="mobile-nav-panel"
                >
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                    <BrandMark className="text-xl" />
                    <button
                      type="button"
                      className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileOpen(false)}
                      aria-label="Close menu"
                      data-testid="mobile-nav-close"
                    >
                      <X size={22} />
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        data-testid={`mobile-nav-${link.to === '/' ? 'home' : link.to.slice(1)}`}
                        className={cn(
                          'rounded-xl px-4 py-3.5 text-base font-medium transition',
                          location.pathname === link.to
                            ? 'bg-brand-gold/20 text-brand-gold'
                            : 'text-white hover:bg-white/5 hover:text-brand-gold'
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </motion.nav>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'text-sm font-medium transition-colors hover:text-brand-gold',
                location.pathname === link.to ? 'text-brand-gold' : 'text-white/80'
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/cart"
            className="relative rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-brand-gold"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            to="/cart"
            className="relative rounded-full p-2 text-white/70 hover:text-brand-gold"
            aria-label="Cart"
          >
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="rounded-full p-2"
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
    <footer className="border-t border-white/10 bg-brand-dark-light">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <BrandMark />
            <p className="mt-3 text-sm text-white/60">{restaurant.tagline}</p>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-brand-green">Quick Links</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link to="/menu" className="hover:text-brand-gold">
                  Browse Menu
                </Link>
              </li>
              <li>
                <Link to="/build" className="hover:text-brand-gold">
                  Build Your Pack
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-brand-gold">
                  About
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-brand-gold">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-brand-gold">
                  Support
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-gold">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/refund" className="hover:text-brand-gold">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-brand-green">Contact</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>{restaurant.address}</li>
              {restaurant.hours && <li>{restaurant.hours}</li>}
              <li>
                <a href={`tel:${phoneHref}`} className="hover:text-brand-gold">
                  {restaurant.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${restaurant.email}`} className="hover:text-brand-gold">
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
                      className="hover:text-brand-gold"
                    >
                      WhatsApp
                    </a>
                  )}
                  {restaurant.instagram && (
                    <a
                      href={restaurant.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-brand-gold"
                    >
                      Instagram
                    </a>
                  )}
                  {restaurant.facebook && (
                    <a
                      href={restaurant.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-brand-gold"
                    >
                      Facebook
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          © {new Date().getFullYear()} {restaurant.brandPrefix} {restaurant.brandAccent}. All
          rights reserved.
        </div>
      </div>
    </footer>
  );
}
