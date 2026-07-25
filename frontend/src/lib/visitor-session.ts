const SESSION_KEY = 'ay-food-visitor-session';

export function getVisitorSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    return `tmp-${Date.now()}`;
  }
}

/** Peek without creating a new id (used to purge admin traffic). */
export function peekVisitorSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Drop local visitor id so a later guest visit starts a fresh session. */
export function clearVisitorSessionId() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
