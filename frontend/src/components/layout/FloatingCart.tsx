import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { formatCurrency } from '../../utils/helpers';

export function FloatingCart() {
  const { itemCount, subtotal, packFees, activePacks } = useCart();
  const location = useLocation();

  if (location.pathname === '/cart' || location.pathname === '/checkout') return null;

  const estimate = subtotal + packFees + (subtotal + packFees) * 0.075;

  return (
    <AnimatePresence>
      {itemCount > 0 ? (
        <motion.div
          key="floating-cart"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 w-[min(calc(100vw-5.5rem),20rem)] sm:bottom-6 sm:left-6 sm:z-50 sm:w-auto"
        >
          <Link
            to="/cart"
            className="glass-panel flex w-full items-center gap-3 rounded-2xl p-3 shadow-[0_12px_40px_rgb(0_0_0/0.45)] transition hover:-translate-y-0.5 sm:min-w-[20rem]"
            aria-label="View cart and checkout"
          >
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gold shadow-[0_8px_20px_rgb(249_115_22/0.35)]">
              <ShoppingBag size={22} className="text-white" />
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-dark">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">
                {activePacks.length} pack{activePacks.length === 1 ? '' : 's'} · Checkout
              </span>
              <span className="block text-xs text-secondary">
                {formatCurrency(estimate)}
                {packFees > 0
                  ? ` incl. ${formatCurrency(packFees)} pack fee${activePacks.length > 1 ? 's' : ''}`
                  : ''}
              </span>
            </span>
            <span className="shrink-0 rounded-xl bg-brand-gold px-3 py-2 text-xs font-bold text-white sm:text-sm">
              View cart
            </span>
          </Link>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
