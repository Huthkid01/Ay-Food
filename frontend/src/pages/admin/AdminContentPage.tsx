import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/admin/DeleteConfirmModal';
import {
  DEFAULT_SITE_CONTENT,
  SITE_CONTENT_KEY,
  siteContentService,
  type SiteContent,
} from '../../services/site-content.service';

const sectionMeta = {
  homepage: {
    title: 'Homepage',
    description: 'Control homepage features, popular dishes copy, CTA, banner, and menu page titles.',
  },
  footer: {
    title: 'Footer',
    description: 'Edit brand name, tagline, contact details, hours, and social links.',
  },
  about: {
    title: 'About Page',
    description: 'Update the public about page title and story.',
  },
  faq: {
    title: 'FAQ',
    description: 'Control the FAQ title and question/answer pairs.',
  },
  support: {
    title: 'Support Page',
    description: 'Manage support channels and the refund policy shortcut.',
  },
  terms: {
    title: 'Terms & Conditions',
    description: 'Edit the title, contact email, and legal sections.',
  },
  refund: {
    title: 'Refund Policy',
    description: 'Manage the refund intro, policy rules, and support link label.',
  },
} as const;

type ContentSection = keyof typeof sectionMeta;

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-2.5 text-sm outline-none focus:border-brand-gold';
const labelClass = 'mb-1 block text-sm text-white/60';
const cardClass = 'rounded-2xl border border-white/10 bg-brand-dark-light/40 p-5 sm:p-6';

function isContentSection(value: string | undefined): value is ContentSection {
  return !!value && value in sectionMeta;
}

export default function AdminContentPage() {
  const { section } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [confirmReset, setConfirmReset] = useState(false);

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
      showToast('Website content updated successfully', 'success');
    },
    onError: (err) =>
      showToast(err instanceof Error ? err.message : 'Could not save content', 'error'),
  });

  const reset = useMutation({
    mutationFn: () => siteContentService.update(DEFAULT_SITE_CONTENT),
    onSuccess: (saved) => {
      setConfirmReset(false);
      setDraft(saved);
      queryClient.setQueryData(SITE_CONTENT_KEY, saved);
      showToast('Content reset to defaults', 'success');
    },
  });

  if (!isContentSection(section)) {
    return <Navigate to="/admin/content/homepage" replace />;
  }

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />;
  }

  const meta = sectionMeta[section];
  const r = draft.restaurant;
  const home = draft.home;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Site Content</h1>
          <p className="mt-1 text-sm text-white/50">{meta.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={reset.isPending || save.isPending}
            className="rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save Content'}
          </button>
        </div>
      </div>

      {section === 'homepage' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <h2 className="mb-4 font-semibold">{meta.title}</h2>
            <div className="mb-6 grid gap-4">
              <h3 className="text-sm font-medium text-brand-gold">Feature cards</h3>
              {home.features.map((feature, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      className={fieldClass}
                      value={feature.title}
                      onChange={(e) =>
                        setDraft((d) => {
                          const features = [...d.home.features];
                          features[index] = { ...features[index], title: e.target.value };
                          return { ...d, home: { ...d.home, features } };
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <input
                      className={fieldClass}
                      value={feature.description}
                      onChange={(e) =>
                        setDraft((d) => {
                          const features = [...d.home.features];
                          features[index] = { ...features[index], description: e.target.value };
                          return { ...d, home: { ...d.home, features } };
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['popularHeading', 'Popular heading'],
                  ['popularHighlight', 'Popular highlight'],
                  ['popularSubheading', 'Popular subtitle'],
                  ['popularCtaLabel', 'Popular CTA label'],
                  ['popularCtaTo', 'Popular CTA link'],
                  ['ctaHeading', 'Bottom CTA heading'],
                  ['ctaBody', 'Bottom CTA body'],
                  ['ctaButtonLabel', 'Bottom CTA button'],
                  ['ctaButtonTo', 'Bottom CTA link'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={key === 'ctaBody' || key === 'popularSubheading' ? 'sm:col-span-2' : ''}>
                  <label className={labelClass}>{label}</label>
                  {key === 'ctaBody' ? (
                    <textarea
                      rows={2}
                      className={fieldClass}
                      value={home[key]}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, home: { ...d.home, [key]: e.target.value } }))
                      }
                    />
                  ) : (
                    <input
                      className={fieldClass}
                      value={home[key]}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, home: { ...d.home, [key]: e.target.value } }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="mb-4 font-semibold">Announcement banner</h3>
            <label className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4">
              <span className="text-sm">Show banner under header</span>
              <input
                type="checkbox"
                checked={draft.banner.enabled}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    banner: { ...d.banner, enabled: e.target.checked },
                  }))
                }
                className="h-5 w-5"
              />
            </label>
            <label className={labelClass}>Banner text</label>
            <textarea
              rows={3}
              className={fieldClass}
              value={draft.banner.text}
              onChange={(e) =>
                setDraft((d) => ({ ...d, banner: { ...d.banner, text: e.target.value } }))
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={cardClass}>
              <h3 className="mb-3 font-semibold">Menu page titles</h3>
              {(['title', 'titleHighlight', 'subtitle'] as const).map((key) => (
                <div key={key} className="mb-3">
                  <label className={labelClass}>{key}</label>
                  <input
                    className={fieldClass}
                    value={draft.menuPage[key]}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        menuPage: { ...d.menuPage, [key]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className={cardClass}>
              <h3 className="mb-3 font-semibold">Build Pack page titles</h3>
              {(['title', 'titleHighlight', 'subtitle'] as const).map((key) => (
                <div key={key} className="mb-3">
                  <label className={labelClass}>{key}</label>
                  <input
                    className={fieldClass}
                    value={draft.buildPage[key]}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        buildPage: { ...d.buildPage, [key]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'footer' && (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold">{meta.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['brandPrefix', 'Brand prefix'],
                ['brandAccent', 'Brand accent'],
                ['legalName', 'Legal / display name'],
                ['tagline', 'Footer tagline'],
                ['address', 'Address'],
                ['phone', 'Phone'],
                ['email', 'Email'],
                ['hours', 'Opening hours'],
                ['whatsapp', 'WhatsApp link'],
                ['instagram', 'Instagram URL'],
                ['facebook', 'Facebook URL'],
                ['bankName', 'Bank name (checkout)'],
                ['accountName', 'Account name (checkout)'],
                ['accountNumber', 'Account number (checkout)'],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className={
                  key === 'tagline' || key === 'address' || key === 'legalName' ? 'sm:col-span-2' : ''
                }
              >
                <label className={labelClass}>{label}</label>
                {key === 'tagline' ? (
                  <textarea
                    rows={3}
                    className={fieldClass}
                    value={r[key] ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        restaurant: { ...d.restaurant, [key]: e.target.value },
                      }))
                    }
                  />
                ) : (
                  <input
                    className={fieldClass}
                    value={r[key] ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        restaurant: { ...d.restaurant, [key]: e.target.value },
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'about' && (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold">{meta.title}</h2>
          <div className="mb-4">
            <label className={labelClass}>Title</label>
            <input
              className={fieldClass}
              value={draft.about.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, about: { ...d.about, title: e.target.value } }))
              }
            />
          </div>
          {draft.about.paragraphs.map((p, index) => (
            <div key={index} className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <label className={labelClass}>Paragraph {index + 1}</label>
                {draft.about.paragraphs.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-red-300"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        about: {
                          ...d.about,
                          paragraphs: d.about.paragraphs.filter((_, i) => i !== index),
                        },
                      }))
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                className={fieldClass}
                value={p}
                onChange={(e) =>
                  setDraft((d) => {
                    const paragraphs = [...d.about.paragraphs];
                    paragraphs[index] = e.target.value;
                    return { ...d, about: { ...d.about, paragraphs } };
                  })
                }
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                about: { ...d.about, paragraphs: [...d.about.paragraphs, ''] },
              }))
            }
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm"
          >
            <Plus size={16} /> Add paragraph
          </button>
        </div>
      )}

      {section === 'faq' && (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold">{meta.title}</h2>
          <div className="mb-4">
            <label className={labelClass}>Page title</label>
            <input
              className={fieldClass}
              value={draft.faq.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, faq: { ...d.faq, title: e.target.value } }))
              }
            />
          </div>
          {draft.faq.items.map((item, index) => (
            <div key={index} className="mb-4 rounded-xl border border-white/10 p-4">
              <div className="mb-2 flex justify-between">
                <p className="text-sm font-medium">Question {index + 1}</p>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      faq: { ...d.faq, items: d.faq.items.filter((_, i) => i !== index) },
                    }))
                  }
                  className="text-white/50 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <input
                className={`${fieldClass} mb-2`}
                value={item.question}
                placeholder="Question"
                onChange={(e) =>
                  setDraft((d) => {
                    const items = [...d.faq.items];
                    items[index] = { ...items[index], question: e.target.value };
                    return { ...d, faq: { ...d.faq, items } };
                  })
                }
              />
              <textarea
                rows={3}
                className={fieldClass}
                value={item.answer}
                placeholder="Answer"
                onChange={(e) =>
                  setDraft((d) => {
                    const items = [...d.faq.items];
                    items[index] = { ...items[index], answer: e.target.value };
                    return { ...d, faq: { ...d.faq, items } };
                  })
                }
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                faq: { ...d.faq, items: [...d.faq.items, { question: '', answer: '' }] },
              }))
            }
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm"
          >
            <Plus size={16} /> Add FAQ
          </button>
        </div>
      )}

      {section === 'support' && (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold">{meta.title}</h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Title</label>
              <input
                className={fieldClass}
                value={draft.support.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, support: { ...d.support, title: e.target.value } }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Intro</label>
              <textarea
                rows={2}
                className={fieldClass}
                value={draft.support.intro}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, support: { ...d.support, intro: e.target.value } }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Refund policy button label</label>
              <input
                className={fieldClass}
                value={draft.support.refundPolicyButtonLabel}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    support: { ...d.support, refundPolicyButtonLabel: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          {draft.support.channels.map((ch, index) => (
            <div key={index} className="mb-3 grid gap-2 rounded-xl border border-white/10 p-4 sm:grid-cols-3">
              <input
                className={fieldClass}
                value={ch.title}
                placeholder="Title"
                onChange={(e) =>
                  setDraft((d) => {
                    const channels = [...d.support.channels];
                    channels[index] = { ...channels[index], title: e.target.value };
                    return { ...d, support: { ...d.support, channels } };
                  })
                }
              />
              <input
                className={fieldClass}
                value={ch.description}
                placeholder="Description"
                onChange={(e) =>
                  setDraft((d) => {
                    const channels = [...d.support.channels];
                    channels[index] = { ...channels[index], description: e.target.value };
                    return { ...d, support: { ...d.support, channels } };
                  })
                }
              />
              <input
                className={fieldClass}
                value={ch.href}
                placeholder="Link"
                onChange={(e) =>
                  setDraft((d) => {
                    const channels = [...d.support.channels];
                    channels[index] = { ...channels[index], href: e.target.value };
                    return { ...d, support: { ...d.support, channels } };
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      {section === 'terms' && (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold">{meta.title}</h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Title</label>
              <input
                className={fieldClass}
                value={draft.terms.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, terms: { ...d.terms, title: e.target.value } }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Contact email</label>
              <input
                className={fieldClass}
                value={draft.terms.contactEmail}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    terms: { ...d.terms, contactEmail: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          {draft.terms.sections.map((sec, index) => (
            <div key={index} className="mb-4 rounded-xl border border-white/10 p-4">
              <input
                className={`${fieldClass} mb-2`}
                value={sec.title}
                placeholder="Section title"
                onChange={(e) =>
                  setDraft((d) => {
                    const sections = [...d.terms.sections];
                    sections[index] = { ...sections[index], title: e.target.value };
                    return { ...d, terms: { ...d.terms, sections } };
                  })
                }
              />
              <textarea
                rows={3}
                className={fieldClass}
                value={sec.body}
                placeholder="Section body"
                onChange={(e) =>
                  setDraft((d) => {
                    const sections = [...d.terms.sections];
                    sections[index] = { ...sections[index], body: e.target.value };
                    return { ...d, terms: { ...d.terms, sections } };
                  })
                }
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                terms: {
                  ...d.terms,
                  sections: [...d.terms.sections, { title: '', body: '' }],
                },
              }))
            }
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm"
          >
            <Plus size={16} /> Add section
          </button>
        </div>
      )}

      {section === 'refund' && (
        <div className={cardClass}>
          <h2 className="mb-4 font-semibold">{meta.title}</h2>
          <div className="mb-4">
            <label className={labelClass}>Title</label>
            <input
              className={fieldClass}
              value={draft.refund.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, refund: { ...d.refund, title: e.target.value } }))
              }
            />
          </div>
          <div className="mb-4">
            <label className={labelClass}>Intro</label>
            <textarea
              rows={3}
              className={fieldClass}
              value={draft.refund.intro}
              onChange={(e) =>
                setDraft((d) => ({ ...d, refund: { ...d.refund, intro: e.target.value } }))
              }
            />
          </div>
          {draft.refund.rules.map((rule, index) => (
            <div key={index} className="mb-3 flex gap-2">
              <input
                className={fieldClass}
                value={rule}
                onChange={(e) =>
                  setDraft((d) => {
                    const rules = [...d.refund.rules];
                    rules[index] = e.target.value;
                    return { ...d, refund: { ...d.refund, rules } };
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    refund: {
                      ...d.refund,
                      rules: d.refund.rules.filter((_, i) => i !== index),
                    },
                  }))
                }
                className="rounded-xl border border-white/10 p-2 text-white/50 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                refund: { ...d.refund, rules: [...d.refund.rules, ''] },
              }))
            }
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm"
          >
            <Plus size={16} /> Add rule
          </button>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Support link label</label>
              <input
                className={fieldClass}
                value={draft.refund.supportLinkLabel}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    refund: { ...d.refund, supportLinkLabel: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Update note</label>
              <input
                className={fieldClass}
                value={draft.refund.updateNote}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    refund: { ...d.refund, updateNote: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmReset}
        title="Reset site content?"
        message="This replaces all website content with the default text. You can edit again after reset."
        confirmLabel="Yes, reset defaults"
        loading={reset.isPending}
        onConfirm={() => reset.mutate()}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  );
}
