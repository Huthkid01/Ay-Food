import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, Plus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/ui/Toast';
import { formatCurrency } from '../utils/helpers';
import { PACK_FEE, packItemsTotal } from '../types';

export default function CartPage() {
  const navigate = useNavigate();
  const { packs, activePacks, subtotal, packFees, removePackItem, clearCart, addPack } = useCart();
  const { showToast } = useToast();

  const tax = (subtotal + packFees) * 0.075;
  // Delivery is chosen at checkout — cart shows items + tax only
  const total = subtotal + packFees + tax;

  function handleAddAnotherPack() {
    const newIndex = packs.length;
    addPack();
    showToast(`Pack ${newIndex + 1} created — add food items to it`);
    navigate(`/build?editPack=${newIndex}`, { replace: false });
  }

  if (activePacks.length === 0) {
    return (
      <div className="site-container py-20 text-center sm:py-28">
        <h1 className="mb-4 font-display text-4xl font-semibold tracking-tight">Your Cart is Empty</h1>
        <p className="mb-10 text-secondary">
          Add items from the menu — your first item creates Pack 1 automatically
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link to="/menu" className="btn-primary btn-ripple">
            Browse Menu
          </Link>
          <Link to="/build" className="btn-secondary">
            Build Pack
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="site-container pb-28 pt-8 sm:pb-12 sm:pt-10">
      <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight sm:mb-10">
        Your <span className="text-gradient">Cart</span>
      </h1>

      <div className={activePacks.length >= 2 ? 'grid grid-cols-2 gap-3 sm:gap-6' : 'space-y-6'}>
        {activePacks.map((pack) => {
          const packIndex = packs.findIndex((p) => p.id === pack.id);
          return (
            <div
              key={pack.id}
              className="min-w-0 rounded-3xl border border-brand-subtle bg-brand-card p-4 sm:p-6"
            >
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-brand-gold sm:text-lg">{pack.name}</h3>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleAddAnotherPack}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-gold/50 px-2.5 py-1 text-[11px] font-medium text-brand-gold transition hover:bg-brand-gold/10 sm:px-3 sm:py-1.5 sm:text-sm"
                  >
                    <Plus size={12} className="sm:hidden" />
                    <Plus size={14} className="hidden sm:block" />
                    Add Another Pack
                  </button>
                  <Link
                    to={`/build?editPack=${packIndex}`}
                    className="text-xs text-secondary transition hover:text-brand-gold sm:text-sm"
                  >
                    Edit Pack
                  </Link>
                </div>
              </div>

              <ul className="mb-4 space-y-3">
                {pack.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 border-b border-brand-subtle pb-3 text-xs last:border-0 sm:items-center sm:gap-4 sm:text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium">{item.foodName}</p>
                      <p className="text-muted">
                        {item.portionName} · {formatCurrency(item.unitPrice)} × {item.quantity}
                        {item.unitPrice === 0 ? ' (free)' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      <span className="font-medium text-brand-gold">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                      <button
                        onClick={() => {
                          removePackItem(pack.id, item.id);
                          showToast(`${item.foodName} removed from ${pack.name}`);
                        }}
                        className="text-white/40 transition hover:text-red-400"
                      >
                        <Trash2 size={14} className="sm:hidden" />
                        <Trash2 size={16} className="hidden sm:block" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between border-t border-brand-subtle pt-3 text-xs sm:text-sm">
                <span className="text-secondary">Pack total</span>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(packItemsTotal(pack))}</p>
                  <p className="text-[10px] text-brand-gold sm:text-xs">
                    + {formatCurrency(PACK_FEE)} pack fee
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-brand-subtle bg-brand-card p-6 sm:p-8">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary">Items subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-secondary">
            <span>
              Pack fees ({activePacks.length} × {formatCurrency(PACK_FEE)})
            </span>
            <span>{formatCurrency(packFees)}</span>
          </div>
          <div className="flex justify-between text-secondary">
            <span>Tax (7.5%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <p className="text-xs text-muted">
            Delivery fee (₦1,500) is added at checkout if you choose delivery.
          </p>
          <div className="flex justify-between border-t border-brand-subtle pt-4 text-xl font-bold">
            <span>Total</span>
            <span className="text-brand-gold">{formatCurrency(total)}</span>
          </div>
        </div>
        <Link
          to="/checkout"
          className="btn-primary btn-ripple mt-6 flex w-full items-center justify-center gap-2 py-3.5"
        >
          Proceed to Checkout <ArrowRight size={18} />
        </Link>
        <button
          onClick={clearCart}
          className="mt-3 w-full text-sm text-muted transition hover:text-red-400"
        >
          Clear cart
        </button>
      </div>

      {/* Sticky mobile checkout — left, like View cart (keeps right clear for chat) */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 w-[min(calc(100vw-5.5rem),20rem)] sm:hidden">
        <Link
          to="/checkout"
          className="glass-panel flex w-full items-center justify-between gap-3 rounded-2xl p-3 shadow-[0_12px_40px_rgb(0_0_0/0.45)]"
          aria-label="Proceed to checkout"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">Checkout</span>
            <span className="block text-xs text-secondary">{formatCurrency(total)}</span>
          </span>
          <span className="shrink-0 rounded-xl bg-brand-gold px-3 py-2 text-xs font-bold text-white">
            Continue
          </span>
        </Link>
      </div>
    </div>
  );
}
