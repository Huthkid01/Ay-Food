import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { AdminModal } from '../../components/admin/AdminModal';
import { AdminPagination, ADMIN_PAGE_SIZE } from '../../components/admin/AdminPagination';
import { ConfirmModal, DeleteConfirmModal } from '../../components/admin/DeleteConfirmModal';
import { useToast } from '../../components/ui/Toast';
import {
  categoryAdminService,
  foodAdminService,
  importFlyerMenuToDatabase,
  type FoodInput,
} from '../../services/admin-menu.service';
import { notifyCatalogChanged, MENU_CATALOG_KEY } from '../../services/menu-catalog';
import { storageService } from '../../services/storage.service';
import type { AdminFood } from '../../services/admin-store';
import { formatCurrency, slugify } from '../../utils/helpers';
import { resolveFoodImage } from '../../utils/food-images';

type FoodForm = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  price: string;
  prepTimeMinutes: string;
  imageUrl: string;
  isAvailable: boolean;
  isPopular: boolean;
  isNew: boolean;
};

type StatusFilter = 'all' | 'available' | 'hidden';
type FeaturedFilter = 'all' | 'popular' | 'new' | 'none';

const selectClass =
  'rounded-xl border border-white/10 bg-brand-dark-light px-3 py-2.5 text-sm text-white outline-none focus:border-brand-gold';

function emptyForm(categoryId: string): FoodForm {
  return {
    name: '',
    slug: '',
    description: '',
    categoryId,
    price: '',
    prepTimeMinutes: '15',
    imageUrl: '',
    isAvailable: true,
    isPopular: false,
    isNew: false,
  };
}

function formFromFood(food: AdminFood, categoryId: string): FoodForm {
  return {
    name: food.name,
    slug: food.slug,
    description: food.description ?? '',
    categoryId,
    price: String(food.portions?.[0]?.price ?? ''),
    prepTimeMinutes: String(food.prepTimeMinutes ?? 15),
    imageUrl: food.image || resolveFoodImage(food),
    isAvailable: food.isAvailable !== false,
    isPopular: food.isPopular,
    isNew: food.isNew,
  };
}

function exportFoodsCsv(foods: AdminFood[]) {
  const headers = [
    'Name',
    'Slug',
    'Category',
    'Price',
    'Status',
    'Popular',
    'New',
    'PrepMinutes',
    'Description',
  ];
  const rows = foods.map((f) => [
    f.name,
    f.slug,
    f.category?.name ?? '',
    String(f.portions?.[0]?.price ?? ''),
    f.isAvailable !== false ? 'Available' : 'Hidden',
    f.isPopular ? 'Yes' : 'No',
    f.isNew ? 'Yes' : 'No',
    String(f.prepTimeMinutes ?? ''),
    (f.description ?? '').replace(/\n/g, ' '),
  ]);

  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ay-food-menu-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminMenuPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>('all');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFood | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminFood | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [form, setForm] = useState<FoodForm>(() => emptyForm(''));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: categories = [], error: categoriesError } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoryAdminService.list(),
    retry: false,
  });

  const { data: foods = [], isLoading, error: foodsError } = useQuery({
    queryKey: ['admin-foods'],
    queryFn: () => foodAdminService.list(),
    retry: false,
  });

  const listError = foodsError || categoriesError;
  const hasActiveFilters =
    search.trim() !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    featuredFilter !== 'all';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return foods.filter((f) => {
      if (term) {
        const hay = [f.name, f.slug, f.category?.name ?? '', f.description ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (categoryFilter !== 'all' && f.category?.slug !== categoryFilter) return false;
      if (statusFilter === 'available' && f.isAvailable === false) return false;
      if (statusFilter === 'hidden' && f.isAvailable !== false) return false;
      if (featuredFilter === 'popular' && !f.isPopular) return false;
      if (featuredFilter === 'new' && !f.isNew) return false;
      if (featuredFilter === 'none' && (f.isPopular || f.isNew)) return false;
      return true;
    });
  }, [foods, search, categoryFilter, statusFilter, featuredFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * ADMIN_PAGE_SIZE;
    return filtered.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, featuredFilter]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setFeaturedFilter('all');
    setPage(1);
  };

  const resolveCategoryId = (food: AdminFood) => {
    const match = categories.find(
      (c) => c.slug === food.category?.slug || c.name === food.category?.name
    );
    return match?.id ?? categories[0]?.id ?? '';
  };

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(categories[0]?.id ?? ''));
    resetImageState();
    setIsModalOpen(true);
  };

  const openEdit = (food: AdminFood) => {
    setEditing(food);
    setForm(formFromFood(food, resolveCategoryId(food)));
    resetImageState();
    setImagePreview(resolveFoodImage(food) || null);
    setIsModalOpen(true);
  };

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }
    setImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
    showToast('Photo selected — click Save to upload', 'info');
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Name is required');
      if (!form.categoryId) throw new Error('Category is required');
      if (form.price.trim() === '') {
        throw new Error('Enter a price (0 or more). Leave blank is not allowed.');
      }
      const price = Number(form.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Price must be 0 or higher (0 = free / confirm with kitchen)');
      }
      const cat = categories.find((c) => c.id === form.categoryId);
      if (!cat) throw new Error('Pick a category');

      const slug = form.slug.trim() || slugify(form.name);
      let imageUrl = form.imageUrl.trim() || undefined;
      if (imageFile) {
        imageUrl = await storageService.uploadFile(
          'food-images',
          `${slug || 'dish'}/${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`,
          imageFile
        );
      }

      // Description is optional — empty is fine
      const payload: FoodInput = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        image: imageUrl,
        categoryId: cat.id,
        categoryName: cat.name,
        categorySlug: cat.slug,
        price,
        isAvailable: form.isAvailable,
        isPopular: form.isPopular,
        isNew: form.isNew,
        prepTimeMinutes: Number(form.prepTimeMinutes) || 15,
      };

      return editing
        ? foodAdminService.update(editing.id, payload)
        : foodAdminService.create(payload);
    },
    onSuccess: () => {
      const wasEditing = Boolean(editing);
      queryClient.invalidateQueries({ queryKey: ['admin-foods'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: MENU_CATALOG_KEY });
      notifyCatalogChanged();
      showToast(
        wasEditing ? 'Dish updated successfully' : 'Dish added successfully',
        'success'
      );
      setIsModalOpen(false);
      setEditing(null);
      resetImageState();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Save failed', 'error'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => foodAdminService.remove(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-foods'] });
      queryClient.invalidateQueries({ queryKey: MENU_CATALOG_KEY });
      notifyCatalogChanged();
      showToast(
        result.archived ? 'Dish archived (used in past orders)' : 'Dish deleted successfully',
        'success'
      );
      setPendingDelete(null);
    },
    onError: () => showToast('Could not delete dish', 'error'),
  });

  const importSite = useMutation({
    mutationFn: async () => importFlyerMenuToDatabase(),
    onSuccess: (result) => {
      setConfirmImport(false);
      queryClient.invalidateQueries({ queryKey: ['admin-foods'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: MENU_CATALOG_KEY });
      notifyCatalogChanged();
      showToast(`Imported ${result.foods} dishes to database`, 'success');
    },
    onError: (err) =>
      showToast(err instanceof Error ? err.message : 'Import failed', 'error'),
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />;
  }

  if (listError) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
        <h1 className="font-display text-2xl font-bold">Could not load menu</h1>
        <p className="mt-2 text-sm text-white/70">
          {listError instanceof Error ? listError.message : 'Please sign in again and retry.'}
        </p>
      </div>
    );
  }

  const previewSrc = imagePreview || form.imageUrl || null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Menu Management</h1>
          <p className="mt-1 text-sm text-white/50">
            Manage your menu catalog ({foods.length} total dishes)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              exportFoodsCsv(filtered);
              showToast(`Exported ${filtered.length} dishes`);
            }}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-brand-green/40 px-4 py-2.5 text-sm font-semibold text-brand-green disabled:opacity-50"
          >
            <Download size={16} />
            Export ({filtered.length})
          </button>
          <button
            type="button"
            onClick={() => setConfirmImport(true)}
            disabled={importSite.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <Upload size={16} />
            {importSite.isPending ? 'Importing…' : 'Import site menu'}
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={categories.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            title={categories.length === 0 ? 'Add a category first' : undefined}
          >
            <Plus size={16} /> Add Dish
          </button>
        </div>
      </div>

      {categories.length === 0 && (
        <p className="mb-4 rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm text-brand-gold">
          Create at least one category before adding dishes.
        </p>
      )}

      <div className="mb-4 space-y-3 rounded-2xl border border-white/10 bg-brand-dark-light/50 p-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/35"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes…"
            className="w-full rounded-xl border border-white/10 bg-brand-dark py-2.5 pr-4 pl-10 text-sm outline-none focus:border-brand-gold"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={selectClass}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="hidden">Hidden</option>
          </select>

          <select
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilter)}
            className={selectClass}
            aria-label="Filter by featured"
          >
            <option value="all">All Featured</option>
            <option value="popular">Popular</option>
            <option value="new">New</option>
            <option value="none">Not featured</option>
          </select>

          <div className="flex items-center justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-brand-gold hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-190 text-left text-sm">
          <thead className="bg-brand-dark-light text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Dish</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Category</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Price</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Status</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((food) => {
              const price = food.portions?.[0]?.price ?? 0;
              const thumb = resolveFoodImage(food, 'thumb');
              return (
                <tr key={food.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-dark">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            width={96}
                            height={96}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/20">
                            <ImagePlus size={18} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{food.name}</p>
                        <p className="text-xs text-white/40">{food.slug}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {food.isPopular && (
                            <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[11px] text-brand-gold">
                              Popular
                            </span>
                          )}
                          {food.isNew && (
                            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] text-blue-300">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{food.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-brand-gold">
                    {formatCurrency(price)}
                    {price === 0 ? (
                      <span className="ml-1 text-[11px] font-normal text-white/45">(free)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        food.isAvailable !== false
                          ? 'rounded-full bg-brand-green/20 px-2.5 py-1 text-[11px] text-brand-green'
                          : 'rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/40'
                      }
                    >
                      {food.isAvailable !== false ? 'Available' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(food)}
                        className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/5 hover:text-brand-gold"
                        aria-label={`Edit ${food.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(food)}
                        className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-red-500/10 hover:text-red-400"
                        aria-label={`Delete ${food.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/40">
                  {hasActiveFilters
                    ? 'No dishes match your filters. Try Clear All.'
                    : 'No dishes yet. Click Add Dish or Import site menu.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={safePage}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={ADMIN_PAGE_SIZE}
        onPageChange={setPage}
      />

      <AdminModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Edit dish' : 'Add dish'}
        busy={save.isPending}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm"
              disabled={save.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-dish-form"
              disabled={save.isPending || form.price.trim() === ''}
              className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add dish'}
            </button>
          </>
        }
      >
        <form
          id="admin-dish-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div>
            <label className="mb-2 block text-sm text-white/60">Dish photo</label>
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-brand-dark">
                {previewSrc ? (
                  <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/25">
                    <ImagePlus size={28} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm hover:border-brand-gold hover:text-brand-gold">
                  <Upload size={16} />
                  Upload image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={onPickImage}
                  />
                </label>
                <p className="text-xs text-white/40">JPG, PNG or WebP · max 5MB</p>
                {(previewSrc || form.imageUrl) && (
                  <button
                    type="button"
                    className="text-xs text-red-300 hover:underline"
                    onClick={() => {
                      resetImageState();
                      setForm((f) => ({ ...f, imageUrl: '' }));
                    }}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/60">Name</label>
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  slug: editing ? f.slug : slugify(name),
                }));
              }}
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/60">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/60">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
              required
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-4">
            <label className="mb-1 block text-sm font-medium text-brand-gold">Price (₦)</label>
            <input
              type="number"
              min={0}
              step={50}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="Required — use 0 for free soups"
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 text-lg font-semibold outline-none focus:border-brand-gold"
              required
            />
            {form.price.trim() === '' ? (
              <p className="mt-2 text-sm text-red-300/90">
                Price is required. Enter 0 or any amount above 0.
              </p>
            ) : Number(form.price) === 0 ? (
              <p className="mt-2 text-sm text-white/50">
                Customers can add this for ₦0 — it still appears in their order summary.
              </p>
            ) : Number.isFinite(Number(form.price)) && Number(form.price) > 0 ? (
              <p className="mt-2 text-sm text-white/50">
                Customers will see {formatCurrency(Number(form.price))}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/60">Prep time (minutes)</label>
            <input
              type="number"
              min={1}
              value={form.prepTimeMinutes}
              onChange={(e) => setForm((f) => ({ ...f, prepTimeMinutes: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/60">
              Description <span className="text-white/35">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Leave blank if you only want a photo and price"
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
              />
              Available on site
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))}
              />
              Popular
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => setForm((f) => ({ ...f, isNew: e.target.checked }))}
              />
              New
            </label>
          </div>
        </form>
      </AdminModal>

      <DeleteConfirmModal
        open={!!pendingDelete}
        title="Delete dish"
        message={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? If it was used in orders it may be archived instead.`
            : ''
        }
        loading={remove.isPending}
        onClose={() => !remove.isPending && setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />

      <ConfirmModal
        open={confirmImport}
        title="Import site menu?"
        message="This upserts the full flyer menu into the database (categories, dishes, prices, and photos)."
        confirmLabel="Yes, import menu"
        tone="primary"
        loading={importSite.isPending}
        onConfirm={() => importSite.mutate()}
        onClose={() => setConfirmImport(false)}
      />
    </div>
  );
}
