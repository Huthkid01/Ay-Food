import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/** Shown after FormSubmit redirects here — notifies opener and closes popup */
export default function FormSubmitOkPage() {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'formsubmit:success' }, window.location.origin);
      window.setTimeout(() => window.close(), 400);
      return;
    }
    setStandalone(true);
  }, []);

  if (!standalone) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center p-8 text-center">
        <p className="text-sm text-white/60">Sending… this window will close.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-medium text-white">Message sent.</p>
      <p className="text-sm text-white/55">You can close this tab and return to the site.</p>
      <Link to="/" className="mt-2 text-sm text-brand-gold hover:underline">
        Back to Ay Food
      </Link>
    </main>
  );
}
