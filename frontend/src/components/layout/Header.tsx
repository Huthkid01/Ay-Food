import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../../contexts/CartContext';
import { useSiteContentData } from '../../hooks/useSiteContent';
import { brandDisplayName } from '../../data/default-site-content';
import { BrandLogo } from '../ui/BrandLogo';
import { cn } from '../../utils/helpers';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
  return <BrandLogo className={className} size="md" tone="dark" />;
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
    typeof document !== 'undefined' && mobileOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            data-testid="mobile-nav-drawer"
          >
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/70 transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <nav
              className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] translate-x-0 flex-col bg-[#111111] shadow-2xl transition-transform duration-300 ease-out"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
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
            </nav>
          </div>,
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
            {itemCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            ) : null}          </Link>
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
                      className="inline-flex items-center gap-1.5 transition hover:text-[#25D366]"
                    >
                      <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#25D366]" />
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
          © {new Date().getFullYear()} {brandDisplayName(restaurant)}. All
          rights reserved.
        </div>
      </div>
    </footer>
  );
}
