/**
 * FormSubmit from the visitor’s browser (same approach as Travel & Tour).
 * Endpoint: https://formsubmit.co/{email}
 * Uses a top-level form POST in a popup — FormSubmit blocks iframes / often 403s ajax from servers.
 */

export type FormSubmitResult = { ok: boolean; message?: string };

const DONE_PATH = '/formsubmit-ok';
const MESSAGE_TYPE = 'formsubmit:success';

/** Admin alert inbox — override with VITE_FORMSUBMIT_EMAIL if needed. */
export function getFormSubmitRecipient(): string {
  return (
    import.meta.env.VITE_FORMSUBMIT_EMAIL?.trim() ||
    'contact@ayfoodpalace.com'
  );
}

/** Real FormSubmit endpoint — https://formsubmit.co/email (not /ajax/) */
export function getFormSubmitActionUrl(): string {
  const email = getFormSubmitRecipient();
  const accessKey = import.meta.env.VITE_FORMSUBMIT_ACCESS_KEY?.trim();
  const base = `https://formsubmit.co/${email}`;
  return accessKey ? `${base}/${accessKey}` : base;
}

function activationMessage(): string {
  return `FormSubmit is not activated yet. Submit once on the live site, then click the activation link in ${getFormSubmitRecipient()} (check spam).`;
}

/**
 * POST with a real HTML form in a popup window (top-level navigation).
 * FormSubmit blocks iframes (X-Frame-Options: sameorigin) — do not use hidden iframe.
 */
export function postFormSubmitBrowser(
  fields: Record<string, string>,
  options?: { timeoutMs?: number },
): Promise<FormSubmitResult> {
  if (typeof document === 'undefined') {
    return Promise.resolve({ ok: false, message: 'Not in browser' });
  }

  const timeoutMs = options?.timeoutMs ?? 90_000;
  const nextUrl = `${window.location.origin}${DONE_PATH}`;
  const popupName = `formsubmit_${Date.now()}`;

  const formData: Record<string, string> = {
    _captcha: 'false',
    _template: 'table',
    _url: window.location.href,
    _next: nextUrl,
    ...fields,
  };

  return new Promise((resolve) => {
    let settled = false;
    let popup: Window | null = null;
    let timer = 0;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = getFormSubmitActionUrl();
    form.target = popupName;
    form.acceptCharset = 'UTF-8';
    form.style.display = 'none';

    for (const [key, value] of Object.entries(formData)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    const finish = (result: FormSubmitResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      form.remove();
      try {
        if (popup && !popup.closed) popup.close();
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === MESSAGE_TYPE) {
        finish({ ok: true });
      }
    };

    window.addEventListener('message', onMessage);

    popup = window.open('about:blank', popupName, 'popup=yes,width=480,height=360');

    if (!popup) {
      finish({
        ok: false,
        message:
          'Could not open FormSubmit window. Allow popups for this site, then try again.',
      });
      return;
    }

    timer = window.setTimeout(() => {
      finish({
        ok: false,
        message: `${activationMessage()} If a popup opened, complete any step there and allow popups.`,
      });
    }, timeoutMs);

    document.body.append(form);
    form.submit();
  });
}
