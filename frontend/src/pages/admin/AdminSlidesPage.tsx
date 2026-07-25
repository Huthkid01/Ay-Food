import { useEffect, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import {
  DEFAULT_SITE_CONTENT,
  SITE_CONTENT_KEY,
  siteContentService,
  type SiteContent,
} from '../../services/site-content.service';
import { storageService } from '../../services/storage.service';
import type { HeroSlide } from '../../utils/food-images';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold';
const labelClass = 'mb-1 block text-sm text-white/60';

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
  };
}

export default function AdminSlidesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  const { data, isLoading } = useQuery({
    queryKey: SITE_CONTENT_KEY,
    queryFn: () => siteContentService.get(),
  });

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => siteContentService.update(draft),
    onSuccess: (saved) => {
      setDraft(saved);
      queryClient.setQueryData(SITE_CONTENT_KEY, saved);
      showToast('Slides saved successfully', 'success');
    },
    onError: () => showToast('Could not save slides', 'error'),
  });

  const uploadHeroImage = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }
    try {
      const url = await storageService.uploadFile(
        'food-images',
        `hero/${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
        file
      );
      setDraft((d) => {
        const heroSlides = [...d.heroSlides];
        heroSlides[index] = { ...heroSlides[index], image: url };
        return { ...d, heroSlides };
      });
      showToast('Hero image uploaded', 'success');
    } catch {
      showToast('Could not upload image', 'error');
    }
  };

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Slide Management</h1>
          <p className="mt-1 text-sm text-white/50">
            Manage homepage hero carousel images, titles, and CTAs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save Slides'}
        </button>
      </div>

      <div className="space-y-6">
        {draft.heroSlides.map((slide, index) => (
          <div key={index} className="rounded-2xl border border-white/10 bg-brand-dark-light/40 p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="font-semibold">Slide {index + 1}</h3>
              {draft.heroSlides.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      heroSlides: d.heroSlides.filter((_, i) => i !== index),
                    }))
                  }
                  className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-start gap-4">
              <div className="h-24 w-40 overflow-hidden rounded-xl border border-white/10 bg-brand-dark">
                {slide.image ? (
                  <img src={slide.image} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm hover:border-brand-gold hover:text-brand-gold">
                  <Upload size={16} />
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadHeroImage(index, file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <input
                  className={fieldClass}
                  value={slide.image}
                  onChange={(e) =>
                    setDraft((d) => {
                      const heroSlides = [...d.heroSlides];
                      heroSlides[index] = { ...heroSlides[index], image: e.target.value };
                      return { ...d, heroSlides };
                    })
                  }
                  placeholder="Image URL or /assets/..."
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['tagline', 'Tagline'],
                  ['imagePosition', 'Image position'],
                  ['title', 'Title'],
                  ['highlight', 'Highlight'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className={labelClass}>{label}</label>
                  <input
                    className={fieldClass}
                    value={
                      key === 'imagePosition'
                        ? (slide.imagePosition ?? 'center')
                        : key === 'highlight'
                          ? (slide.highlight ?? '')
                          : slide[key]
                    }
                    onChange={(e) =>
                      setDraft((d) => {
                        const heroSlides = [...d.heroSlides];
                        heroSlides[index] = { ...heroSlides[index], [key]: e.target.value };
                        return { ...d, heroSlides };
                      })
                    }
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  rows={3}
                  className={fieldClass}
                  value={slide.description}
                  onChange={(e) =>
                    setDraft((d) => {
                      const heroSlides = [...d.heroSlides];
                      heroSlides[index] = { ...heroSlides[index], description: e.target.value };
                      return { ...d, heroSlides };
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Primary CTA label</label>
                <input
                  className={fieldClass}
                  value={slide.primaryCta.label}
                  onChange={(e) =>
                    setDraft((d) => {
                      const heroSlides = [...d.heroSlides];
                      heroSlides[index] = {
                        ...heroSlides[index],
                        primaryCta: { ...heroSlides[index].primaryCta, label: e.target.value },
                      };
                      return { ...d, heroSlides };
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Primary CTA link</label>
                <input
                  className={fieldClass}
                  value={slide.primaryCta.to}
                  onChange={(e) =>
                    setDraft((d) => {
                      const heroSlides = [...d.heroSlides];
                      heroSlides[index] = {
                        ...heroSlides[index],
                        primaryCta: { ...heroSlides[index].primaryCta, to: e.target.value },
                      };
                      return { ...d, heroSlides };
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Secondary CTA label</label>
                <input
                  className={fieldClass}
                  value={slide.secondaryCta.label}
                  onChange={(e) =>
                    setDraft((d) => {
                      const heroSlides = [...d.heroSlides];
                      heroSlides[index] = {
                        ...heroSlides[index],
                        secondaryCta: {
                          ...heroSlides[index].secondaryCta,
                          label: e.target.value,
                        },
                      };
                      return { ...d, heroSlides };
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Secondary CTA link</label>
                <input
                  className={fieldClass}
                  value={slide.secondaryCta.to}
                  onChange={(e) =>
                    setDraft((d) => {
                      const heroSlides = [...d.heroSlides];
                      heroSlides[index] = {
                        ...heroSlides[index],
                        secondaryCta: { ...heroSlides[index].secondaryCta, to: e.target.value },
                      };
                      return { ...d, heroSlides };
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}

        {draft.heroSlides.length < 6 && (
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({ ...d, heroSlides: [...d.heroSlides, emptySlide()] }))
            }
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold"
          >
            <Plus size={16} /> Add slide
          </button>
        )}
      </div>
    </div>
  );
}
