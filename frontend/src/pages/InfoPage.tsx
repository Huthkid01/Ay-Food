import { Link, useLocation, Navigate } from 'react-router-dom';
import { useSiteContentData } from '../hooks/useSiteContent';

const VALID = ['about', 'faq', 'support', 'terms', 'refund'] as const;
type InfoPageKey = (typeof VALID)[number];

function isInfoPage(value: string): value is InfoPageKey {
  return (VALID as readonly string[]).includes(value);
}

export default function InfoPage() {
  const location = useLocation();
  const pageKey = location.pathname.replace(/^\//, '');
  const content = useSiteContentData();

  if (!isInfoPage(pageKey)) {
    return <Navigate to="/" replace />;
  }

  const page = pageKey;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {page === 'about' && (
        <>
          <h1 className="mb-6 font-display text-4xl font-bold">{content.about.title}</h1>
          <div className="space-y-4 text-white/70">
            {content.about.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </>
      )}

      {page === 'faq' && (
        <>
          <h1 className="mb-6 font-display text-4xl font-bold">{content.faq.title}</h1>
          <div className="space-y-4">
            {content.faq.items.map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-brand-dark-light p-5">
                <h2 className="mb-2 font-semibold text-brand-gold">{item.question}</h2>
                <p className="text-sm text-white/70">{item.answer}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {page === 'support' && (
        <>
          <h1 className="mb-3 font-display text-4xl font-bold">{content.support.title}</h1>
          <p className="mb-8 text-white/60">{content.support.intro}</p>
          <div className="mb-8 grid gap-4">
            {content.support.channels.map((ch, i) => (
              <a
                key={i}
                href={ch.href}
                className="rounded-2xl border border-white/10 bg-brand-dark-light p-5 transition hover:border-brand-gold/40"
              >
                <h2 className="font-semibold">{ch.title}</h2>
                <p className="mt-1 text-sm text-white/60">{ch.description}</p>
              </a>
            ))}
          </div>
          <Link
            to="/refund"
            className="inline-flex rounded-full border border-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-gold hover:bg-brand-gold hover:text-white"
          >
            {content.support.refundPolicyButtonLabel}
          </Link>
        </>
      )}

      {page === 'terms' && (
        <>
          <h1 className="mb-6 font-display text-4xl font-bold">{content.terms.title}</h1>
          <div className="space-y-6">
            {content.terms.sections.map((sec, i) => (
              <section key={i}>
                <h2 className="mb-2 font-semibold text-brand-gold">{sec.title}</h2>
                <p className="text-white/70">{sec.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-8 text-sm text-white/50">
            Contact:{' '}
            <a href={`mailto:${content.terms.contactEmail}`} className="text-brand-gold">
              {content.terms.contactEmail}
            </a>
          </p>
        </>
      )}

      {page === 'refund' && (
        <>
          <h1 className="mb-4 font-display text-4xl font-bold">{content.refund.title}</h1>
          <p className="mb-6 text-white/70">{content.refund.intro}</p>
          <ul className="mb-8 list-disc space-y-2 pl-5 text-white/70">
            {content.refund.rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
          <Link to="/support" className="text-sm font-semibold text-brand-gold hover:underline">
            {content.refund.supportLinkLabel}
          </Link>
          <p className="mt-6 text-xs text-white/40">{content.refund.updateNote}</p>
        </>
      )}
    </div>
  );
}
