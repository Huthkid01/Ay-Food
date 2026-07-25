import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { AdminPagination, ADMIN_PAGE_SIZE } from '../../components/admin/AdminPagination';
import { DeleteConfirmModal } from '../../components/admin/DeleteConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { categoryAdminService, type CategoryInput } from '../../services/admin-menu.service';
import { notifyCatalogChanged, MENU_CATALOG_KEY } from '../../services/menu-catalog';
import { storageService } from '../../services/storage.service';
import type { AdminCategory } from '../../services/admin-store';
import { slugify } from '../../utils/helpers';

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  imageUrl: string;
};

type StatusFilter = 'all' | 'active' | 'hidden';

const selectClass =
  'rounded-xl border border-white/10 bg-brand-dark-light px-3 py-2.5 text-sm text-white outline-none focus:border-brand-gold';

function emptyForm(sortOrder: number): CategoryForm {
  return {
    name: '',
    slug: '',
    description: '',
    sortOrder: String(sortOrder),
    isActive: true,
    imageUrl: '',
  };
}

function formFromCategory(c: AdminCategory): CategoryForm {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    sortOrder: String(c.sortOrder ?? 0),
    isActive: c.isActive,
    imageUrl: c.image ?? '',
  };
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(() => emptyForm(1));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoryAdminService.list(),
    retry: false,
  });

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (term) {
        const hay = [c.name, c.slug, c.description ?? ''].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'hidden' && c.isActive) return false;
      return true;
    });
  }, [categories, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * ADMIN_PAGE_SIZE;
    return filtered.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPage(1);
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
    setForm(emptyForm(categories.length + 1));
    resetImageState();
    setIsModalOpen(true);
  };

  const openEdit = (c: AdminCategory) => {
    setEditing(c);
    setForm(formFromCategory(c));
    resetImageState();
    setImagePreview(c.image ?? null);
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
      const slug = form.slug.trim() || slugify(form.name);
      let image = form.imageUrl.trim() || undefined;
      if (imageFile) {
        image = await storageService.uploadFile(
          'category-images',
          `${slug || 'category'}/${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`,
          imageFile
        );
      }
      const payload: CategoryInput = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        image,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      return editing
        ? categoryAdminService.update(editing.id, payload)
        : categoryAdminService.create(payload);
    },
    onSuccess: () => {
      const wasEditing = Boolean(editing);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-foods'] });
      queryClient.invalidateQueries({ queryKey: MENU_CATALOG_KEY });
      notifyCatalogChanged();
      showToast(
        wasEditing ? 'Category updated successfully' : 'Category added successfully',
        'success'
      );
      setIsModalOpen(false);
      setEditing(null);
      resetImageState();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Save failed', 'error'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => categoryAdminService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: MENU_CATALOG_KEY });
      notifyCatalogChanged();
      showToast('Category deleted successfully', 'success');
      setPendingDelete(null);
    },
    onError: () => showToast('Could not delete category', 'error'),
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Categories</h1>
          <p className="mt-1 text-sm text-white/50">
            Manage menu categories ({categories.length} total)
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="mb-4 space-y-3 rounded-2xl border border-white/10 bg-brand-dark-light/50 p-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/35"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full rounded-xl border border-white/10 bg-brand-dark py-2.5 pr-4 pl-10 text-sm outline-none focus:border-brand-gold"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={selectClass}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </select>

          <div className="flex items-center text-sm text-white/40 sm:col-span-1">
            {categories.filter((c) => c.isActive).length} active · {filtered.length} shown
          </div>

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
        <table className="w-full min-w-160 text-left text-sm">
          <thead className="bg-brand-dark-light text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Category</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Description</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Sort</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Status</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((cat) => (
              <tr key={cat.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-dark">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/20">
                          <ImagePlus size={18} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-white/40">
                        {cat.slug} · {cat.foodCount} dishes
                      </p>
                    </div>
                  </div>
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-white/60">
                  {cat.description || '—'}
                </td>
                <td className="px-4 py-3 text-white/60">{cat.sortOrder}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      cat.isActive
                        ? 'rounded-full bg-brand-green/20 px-3 py-1 text-xs text-brand-green'
                        : 'rounded-full bg-white/10 px-3 py-1 text-xs text-white/40'
                    }
                  >
                    {cat.isActive ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/5 hover:text-brand-gold"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(cat)}
                      className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-red-500/10 hover:text-red-400"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/40">
                  {hasActiveFilters
                    ? 'No categories match your filters. Try Clear All.'
                    : 'No categories yet. Click Add Category.'}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => !save.isPending && setIsModalOpen(false)}
            aria-label="Close"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-brand-dark-light p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <h2 className="font-display text-2xl font-semibold">
                {editing ? 'Edit category' : 'Add category'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-white/50 hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div>
                <label className="mb-2 block text-sm text-white/60">Category image</label>
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-brand-dark">
                    {imagePreview || form.imageUrl ? (
                      <img
                        src={imagePreview || form.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/25">
                        <ImagePlus size={22} />
                      </div>
                    )}
                  </div>
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
                <label className="mb-1 block text-sm text-white/60">
                  Description <span className="text-white/35">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-white/60">Sort order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
                  />
                </div>
                <label className="flex items-end gap-2 pb-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Show on website
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
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
                  disabled={save.isPending}
                  className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        open={!!pendingDelete}
        title="Delete category"
        message={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? This cannot be undone.`
            : ''
        }
        loading={remove.isPending}
        onClose={() => !remove.isPending && setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </div>
  );
}
