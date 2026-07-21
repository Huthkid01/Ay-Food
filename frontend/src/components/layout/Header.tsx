import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { cn } from '../../utils/helpers';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/build', label: 'Build Pack' },
  { to: '/track', label: 'Track Order' },
];

export function Header() {
  const { itemCount } = useCart();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-tight">
            Ay <span className="text-gradient">Food</span>
          </span>
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
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-xs font-bold text-white">
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
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            className="rounded-full p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/10 bg-brand-dark px-4 py-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'block rounded-lg px-3 py-3 text-base font-medium transition',
                location.pathname === link.to
                  ? 'bg-brand-gold/20 text-brand-gold'
                  : 'text-white/80 hover:bg-white/5 hover:text-brand-gold'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-brand-dark-light">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <span className="font-display text-2xl font-bold">
              Ay <span className="text-gradient">Food</span>
            </span>
            <p className="mt-3 text-sm text-white/60">
              Build your perfect meal pack with authentic Nigerian cuisine. Located in Ogijo,
              Ikorodu — order online with delivery or pickup.
            </p>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-brand-green">Quick Links</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link to="/menu" className="hover:text-brand-gold">Browse Menu</Link></li>
              <li><Link to="/build" className="hover:text-brand-gold">Build Your Pack</Link></li>
              <li><Link to="/cart" className="hover:text-brand-gold">Cart</Link></li>
              <li><Link to="/track" className="hover:text-brand-gold">Track Order</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-brand-green">Contact</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>A.Y Food Mega Palace, Ogijo, Ikorodu, Lagos</li>
              <li>
                <a href="tel:+2349024475402" className="hover:text-brand-gold">+234 902 447 5402</a>
              </li>
              <li>
                <a href="mailto:contact@ayfood.ng" className="hover:text-brand-gold">contact@ayfood.ng</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          © {new Date().getFullYear()} Ay Food. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
