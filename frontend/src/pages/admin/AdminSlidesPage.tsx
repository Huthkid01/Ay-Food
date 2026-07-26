import { useEffect, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Images,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { AdminModal } from '../../components/admin/AdminModal';
import { ConfirmModal } from '../../components/admin/DeleteConfirmModal';
import {
  DEFAULT_SITE_CONTENT,
  SITE_CONTENT_KEY,
  siteContentService,
  type SiteContent,
} from '../../services/site-content.service';
import { storageService } from '../../services/storage.service';
import type { HeroSlide } from '../../utils/food-images';
import { cn } from '../../utils/helpers';

function emptySlide(): HeroSlide {
  return {
    image: '/assets/hero.png',
    tagline: '',
    title: '',
    highlight: '',
    description: '',
    primaryCta: { label: 'Browse Menu', to: '/menu' },
    secondaryCta: { label: 'Build Pack', to: '/build' },
    imagePosition: 'center',
    active: true,
  };
}

function slideTitle(slide: HeroSlide) {
  const t = [slide.title, slide.highlight].filter(Boolean).join(' ').trim();
  return t || slide.tagline || 'Untitled slide';
}

export default function AdminSlidesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<HeroSlide>(emptySlide());
  const [uploading, setUploading] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  /** 1-based display order for the edit/add modal */
  const [orderInput, setOrderInput] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: SITE_CONTENT_KEY,
    queryFn: () => siteContentService.get(),
  });

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (payload: { next: SiteContent; toastMsg?: string; keepModal?: boolean }) => {
      const saved = await siteContentService.update(payload.next);
      return { saved, toastMsg: payload.toastMsg, keepModal: payload.keepModal };
    },
    onSuccess: ({ saved, toastMsg, keepModal }) => {
      setDraft(saved);
      queryClient.setQueryData(SITE_CONTENT_KEY, saved);
      if (!keepModal) setEditingIndex(null);
      showToast(toastMsg ?? 'Slides saved', 'success');
    },
    onError: () => showToast('Could not save slides', 'error'),
  });

  const openCreate = () => {
    setForm(emptySlide());
    setOrderInput(draft.heroSlides.length + 1);
    setEditingIndex(-1);
  };

  const openEdit = (index: number) => {
    setForm({ ...draft.heroSlides[index], active: draft.heroSlides[index].active !== false });
    setOrderInput(index + 1);
    setEditingIndex(index);
  };

  const closeModal = () => {
    if (save.isPending || uploading) return;
    setEditingIndex(null);
  };

  const persistSlides = (
    heroSlides: HeroSlide[],
    opts?: { toastMsg?: string; keepModal?: boolean },
  ) => {
    const next = { ...draft, heroSlides };
    setDraft(next);
    save.mutate({ next, toastMsg: opts?.toastMsg, keepModal: opts?.keepModal });
  };

  const saveModal = () => {
    if (!form.title.trim() && !form.highlight?.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    if (!form.image.trim()) {
      showToast('Add an image or image URL', 'error');
      return;
    }
    let slides = [...draft.heroSlides];
    let fromIndex: number;

    if (editingIndex === -1) {
      if (slides.length >= 6) {
        showToast('Maximum 6 slides', 'error');
        return;
      }
      slides.push(form);
      fromIndex = slides.length - 1;
    } else if (editingIndex !== null) {
      slides[editingIndex] = form;
      fromIndex = editingIndex;
    } else {
      return;
    }

    const toIndex = Math.min(Math.max(Math.round(orderInput) - 1, 0), slides.length - 1);
    if (fromIndex !== toIndex) {
      const [item] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, item);
    }

    persistSlides(slides, { toastMsg: 'Slide saved' });
  };

  const confirmDelete = () => {
    if (deleteIndex === null) return;
    if (draft.heroSlides.length <= 1) {
      showToast('Keep at least one slide', 'error');
      setDeleteIndex(null);
      return;
    }
    const heroSlides = draft.heroSlides.filter((_, i) => i !== deleteIndex);
    setDeleteIndex(null);
    persistSlides(heroSlides, { toastMsg: 'Slide deleted' });
  };

  const uploadHeroImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await storageService.uploadFile(
        'food-images',
        `hero/${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
        file,
      );
      setForm((f) => ({ ...f, image: url }));
      showToast('Image uploaded', 'success');
    } catch {
      showToast('Could not upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= draft.heroSlides.length || from === to) return;
    const heroSlides = [...draft.heroSlides];
    const [item] = heroSlides.splice(from, 1);
    heroSlides.splice(to, 0, item);

    if (editingIndex !== null && editingIndex >= 0) {
      let nextEdit = editingIndex;
      if (editingIndex === from) nextEdit = to;
      else if (from < editingIndex && to >= editingIndex) nextEdit -= 1;
      else if (from > editingIndex && to <= editingIndex) nextEdit += 1;
      setEditingIndex(nextEdit);
      setOrderInput(nextEdit + 1);
    }

    persistSlides(heroSlides, { toastMsg: 'Slide order updated', keepModal: true });
  };

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />;
  }

  const modalOpen = editingIndex !== null;
  const isNew = editingIndex === -1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
            <Images className="text-brand-gold" size={28} />
            Slider Management
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Manage homepage hero sliders shown on the website.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 hover:border-white/30 hover:text-white disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={cn(isFetching && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={draft.heroSlides.length >= 6}
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus size={16} /> Add Slider
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-190 text-left text-sm">
          <thead className="bg-brand-dark-light text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Order</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Slide</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Status</th>
              <th className="px-4 py-3 font-medium tracking-wide uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {draft.heroSlides.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-white/40">
                  No sliders yet. Click Add Slider to create one.
                </td>
              </tr>
            ) : (
              draft.heroSlides.map((slide, index) => {
                const active = slide.active !== false;
                return (
                  <tr key={`${slide.image}-${index}`} className="border-t border-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={index === 0 || save.isPending}
                            onClick={() => moveSlide(index, index - 1)}
                            className="rounded-lg border border-white/10 p-1.5 text-white/70 hover:bg-white/5 hover:text-brand-gold disabled:cursor-not-allowed disabled:opacity-30"
                            title="Move up"
                            aria-label="Move up"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={index === draft.heroSlides.length - 1 || save.isPending}
                            onClick={() => moveSlide(index, index + 1)}
                            className="rounded-lg border border-white/10 p-1.5 text-white/70 hover:bg-white/5 hover:text-brand-gold disabled:cursor-not-allowed disabled:opacity-30"
                            title="Move down"
                            aria-label="Move down"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-brand-dark text-sm font-bold text-brand-gold">
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-dark">
                          {slide.image ? (
                            <img
                              src={slide.image}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{slideTitle(slide)}</p>
                          {slide.description ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-white/40">
                              {slide.description}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-white/40">
                              {slide.primaryCta.label || '—'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          active
                            ? 'rounded-full bg-brand-green/20 px-3 py-1 text-xs text-brand-green'
                            : 'rounded-full bg-white/10 px-3 py-1 text-xs text-white/40'
                        }
                      >
                        {active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a
                          href={slide.primaryCta.to || '/'}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/5 hover:text-brand-gold"
                          aria-label="Open CTA link"
                          title="Open CTA link"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <a
                          href="/"
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/5 hover:text-brand-gold"
                          aria-label="View homepage"
                          title="View homepage"
                        >
                          <Eye size={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => openEdit(index)}
                          className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/5 hover:text-brand-gold"
                          aria-label={`Edit ${slideTitle(slide)}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteIndex(index)}
                          disabled={draft.heroSlides.length <= 1}
                          className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
                          aria-label={`Delete ${slideTitle(slide)}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={isNew ? 'Add Slider' : 'Edit Slider'}
        busy={save.isPending}
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm"
              disabled={save.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveModal}
              disabled={save.isPending || uploading}
              className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : isNew ? 'Add Slider' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-brand-dark">
            {form.image ? (
              <img src={form.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/40">
                No image
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/60">Image URL</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://… or /assets/…"
            />
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-6 text-sm text-white/60 hover:border-brand-gold hover:text-brand-gold">
            <Upload size={20} />
            {uploading ? 'Uploading…' : '+ Upload image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) void uploadHeroImage(file);
                e.target.value = '';
              }}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/60">Title *</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/60">Highlight</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
                value={form.highlight ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, highlight: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/60">Tagline</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              placeholder="Optional eyebrow text"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/60">Description</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional tagline shown on the slide"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/60">Primary CTA label</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
                value={form.primaryCta.label}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primaryCta: { ...f.primaryCta, label: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/60">URL / link</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
                value={form.primaryCta.to}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primaryCta: { ...f.primaryCta, to: e.target.value },
                  }))
                }
                placeholder="/menu"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/60">Secondary CTA label</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
                value={form.secondaryCta.label}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    secondaryCta: { ...f.secondaryCta, label: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/60">Secondary CTA link</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
                value={form.secondaryCta.to}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    secondaryCta: { ...f.secondaryCta, to: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/60">Display order</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={1}
                max={isNew ? draft.heroSlides.length + 1 : draft.heroSlides.length}
                className="w-24 rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold"
                value={orderInput}
                onChange={(e) => setOrderInput(Number(e.target.value) || 1)}
              />
              <span className="text-xs text-white/40">
                1 = first on homepage · {isNew ? draft.heroSlides.length + 1 : draft.heroSlides.length}{' '}
                total
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-brand-dark px-4 py-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-white/40">Inactive slides are hidden on the site</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.active !== false}
              onClick={() => setForm((f) => ({ ...f, active: !(f.active !== false) }))}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors',
                form.active !== false ? 'bg-emerald-500' : 'bg-white/20',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform',
                  form.active !== false && 'translate-x-5',
                )}
              />
            </button>
          </div>
        </div>
      </AdminModal>

      <ConfirmModal
        open={deleteIndex !== null}
        title="Delete slider?"
        message="This removes the slide from the homepage carousel. You can add a new one later."
        confirmLabel="Yes, delete"
        loading={save.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteIndex(null)}
      />
    </div>
  );
}
