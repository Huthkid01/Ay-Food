import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/helpers';

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: AdminPaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pages = buildPageList(page, totalPages);

  return (
    <div
      className={cn(
        'mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/50',
        className
      )}
    >
      <p>
        Showing <span className="text-white/80">{start}</span>–
        <span className="text-white/80">{end}</span> of{' '}
        <span className="text-white/80">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-white/10 p-2 text-white/70 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((item, i) =>
          item === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-white/30">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                'min-w-9 rounded-lg border px-2.5 py-1.5 text-sm font-medium',
                item === page
                  ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                  : 'border-white/10 text-white/70 hover:bg-white/5'
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-white/10 p-2 text-white/70 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function buildPageList(page: number, totalPages: number): Array<number | '…'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | '…'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push('…');
  pages.push(totalPages);
  return pages;
}

export const ADMIN_PAGE_SIZE = 10;
