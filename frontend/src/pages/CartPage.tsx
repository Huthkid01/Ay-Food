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
  const deliveryFee = activePacks.length > 0 ? 1500 : 0;
  const total = subtotal + packFees + tax + deliveryFee;

  function handleAddAnotherPack() {
    const newIndex = packs.length;
    addPack();
    showToast(`Pack ${newIndex + 1} created — add food items to it`);
    navigate(`/build?editPack=${newIndex}`);
  }

  if (activePacks.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="mb-4 font-display text-4xl font-bold">Your Cart is Empty</h1>
        <p className="mb-8 text-white/60">Add items from the menu — your first item creates Pack 1 automatically</p>
        <div className="flex justify-center gap-4">
          <Link to="/menu" className="rounded-full bg-brand-gold px-6 py-3 font-semibold text-white">
            Browse Menu
          </Link>
          <Link to="/build" className="rounded-full border border-white/20 px-6 py-3 hover:border-brand-gold">
            Build Pack
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-display text-4xl font-bold sm:mb-8">
        Your <span className="text-gradient">Cart</span>
      </h1>

      <div className={activePacks.length >= 2 ? 'grid grid-cols-2 gap-3 sm:gap-6' : 'space-y-6'}>
        {activePacks.map((pack) => {
          const packIndex = packs.findIndex((p) => p.id === pack.id);
          return (
          <div key={pack.id} className="min-w-0 rounded-xl border border-white/10 bg-brand-dark-light p-3 sm:rounded-2xl sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-brand-gold sm:text-lg">{pack.name}</h3>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {packIndex === 0 && (
                  <button
                    type="button"
                    onClick={handleAddAnotherPack}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-gold/50 px-2.5 py-1 text-[11px] font-medium text-brand-gold transition hover:bg-brand-gold/10 sm:px-3 sm:py-1.5 sm:text-sm"
                  >
                    <Plus size={12} className="sm:hidden" />
                    <Plus size={14} className="hidden sm:block" />
                    <span className="sm:hidden">Add Pack</span>
                    <span className="hidden sm:inline">Add Another Pack</span>
                  </button>
                )}
                <Link
                  to={`/build?editPack=${packIndex}`}
                  className="text-xs text-white/60 hover:text-brand-gold sm:text-sm"
                >
                  Edit Pack
                </Link>
              </div>
            </div>

            <ul className="mb-3 space-y-2 sm:mb-4 sm:space-y-3">
              {pack.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2 border-b border-white/5 pb-2 text-xs last:border-0 sm:items-center sm:gap-4 sm:pb-3 sm:text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{item.foodName}</p>
                    <p className="text-white/50">
                      {item.portionName} · {formatCurrency(item.unitPrice)} × {item.quantity}
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
                      className="text-white/40 hover:text-red-400"
                    >
                      <Trash2 size={14} className="sm:hidden" />
                      <Trash2 size={16} className="hidden sm:block" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-t border-white/10 pt-2 text-xs sm:pt-3 sm:text-sm">
              <span className="text-white/60">Pack total</span>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(packItemsTotal(pack))}</p>
                <p className="text-[10px] text-brand-gold sm:text-xs">+ {formatCurrency(PACK_FEE)} pack fee</p>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-white/10 bg-brand-dark-light p-6">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Items subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Pack fees ({activePacks.length} × {formatCurrency(PACK_FEE)})</span>
            <span>{formatCurrency(packFees)}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Tax (7.5%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 text-xl font-bold">
            <span>Total</span>
            <span className="text-brand-gold">{formatCurrency(total)}</span>
          </div>
        </div>
        <Link
          to="/checkout"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gold py-3 font-semibold text-white hover:bg-brand-gold-dark"
        >
          Proceed to Checkout <ArrowRight size={18} />
        </Link>
        <button
          onClick={clearCart}
          className="mt-3 w-full text-sm text-white/40 hover:text-red-400"
        >
          Clear cart
        </button>
      </div>
    </div>
  );
}
