/**
 * FormSubmit from the visitor’s browser via AJAX only — never navigates or opens FormSubmit.
 * Docs: https://formsubmit.co/ajax-documentation
 */

export type FormSubmitResult = { ok: boolean; message?: string };

/** Admin alert inbox — override with VITE_FORMSUBMIT_EMAIL if needed. */
export function getFormSubmitRecipient(): string {
  return (
    import.meta.env.VITE_FORMSUBMIT_EMAIL?.trim() ||
    'contact@ayfoodpalace.com'
  );
}

function getFormSubmitAjaxUrl(): string {
  const email = getFormSubmitRecipient();
  const accessKey = import.meta.env.VITE_FORMSUBMIT_ACCESS_KEY?.trim();
  const base = `https://formsubmit.co/ajax/${email}`;
  return accessKey ? `${base}/${accessKey}` : base;
}

/**
 * POST order/payment alert to FormSubmit without opening a popup or leaving checkout.
 * Uses /ajax only — no redirect to formsubmit.co thank-you pages.
 */
export async function postFormSubmitBrowser(
  fields: Record<string, string>,
): Promise<FormSubmitResult> {
  if (typeof fetch === 'undefined') {
    return { ok: false, message: 'Not in browser' };
  }

  try {
    // Strip any accidental redirect hints from callers
    const { _next: _ignoredNext, ...safeFields } = fields as Record<string, string> & {
      _next?: string;
    };

    const res = await fetch(getFormSubmitAjaxUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...safeFields,
        _captcha: 'false',
        _template: 'table',
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        message:
          text.trim() ||
          `FormSubmit returned ${res.status}. Confirm the inbox is activated for ${getFormSubmitRecipient()}.`,
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      message: `Could not reach FormSubmit. Check that ${getFormSubmitRecipient()} is activated.`,
    };
  }
}
