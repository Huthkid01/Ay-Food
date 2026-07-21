import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

export function FloatingCart() {
  const { itemCount } = useCart();
  const location = useLocation();

  if (location.pathname === '/cart' || location.pathname === '/checkout') return null;

  return (
    <Link
      to="/cart"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold shadow-lg transition hover:scale-105 hover:bg-brand-gold-dark"
      aria-label="View cart"
    >
      <ShoppingBag size={28} className="text-white" />
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-green text-xs font-bold text-white">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
