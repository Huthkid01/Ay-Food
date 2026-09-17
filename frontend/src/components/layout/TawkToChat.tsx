import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      minimize?: () => void;
      onLoad?: () => void;
      onChatMaximized?: () => void;
      onChatMinimized?: () => void;
      customStyle?: Record<string, unknown>;
    };
    Tawk_LoadStart?: Date;
  }
}

const TAWK_SRC = 'https://embed.tawk.to/6a65570b15ab181d4e3c7bf2/1judto3bv';
const HIDDEN_ATTR = 'data-ay-tawk-overlay-hidden';

function isTawkIframe(iframe: HTMLIFrameElement) {
  const title = (iframe.getAttribute('title') || '').toLowerCase();
  const name = (iframe.getAttribute('name') || '').toLowerCase();
  const id = (iframe.id || '').toLowerCase();
  const src = (iframe.getAttribute('src') || '').toLowerCase();
  return (
    src.includes('tawk') ||
    id.includes('tawk') ||
    name.includes('tawk') ||
    title.includes('tawk') ||
    title.includes('chat')
  );
}

function hideOverlay(iframe: HTMLIFrameElement) {
  if (!iframe.getAttribute(HIDDEN_ATTR)) {
    iframe.setAttribute(HIDDEN_ATTR, '1');
  }
  iframe.style.setProperty('display', 'none', 'important');
  iframe.style.setProperty('visibility', 'hidden', 'important');
  iframe.style.setProperty('pointer-events', 'none', 'important');
  iframe.style.setProperty('opacity', '0', 'important');
}

function restoreOverlay(iframe: HTMLIFrameElement) {
  if (!iframe.hasAttribute(HIDDEN_ATTR)) return;
  iframe.removeAttribute(HIDDEN_ATTR);
  iframe.style.removeProperty('display');
  iframe.style.removeProperty('visibility');
  iframe.style.removeProperty('pointer-events');
  iframe.style.removeProperty('opacity');
}

/** When the chat is closed, keep only the round button. Hide welcome/shortcut popups on the page. */
function hideExternalTawkOverlays() {
  document.querySelectorAll('iframe').forEach((node) => {
    const iframe = node as HTMLIFrameElement;
    if (!isTawkIframe(iframe)) return;

    const rect = iframe.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const isLauncher = rect.width <= 85 && rect.height <= 85;
    if (isLauncher) {
      restoreOverlay(iframe);
      return;
    }

    hideOverlay(iframe);
  });
}

function restoreExternalTawkOverlays() {
  document.querySelectorAll(`iframe[${HIDDEN_ATTR}]`).forEach((node) => {
    restoreOverlay(node as HTMLIFrameElement);
  });
}

function loadTawkScript() {
  if (document.getElementById('tawk-to-script')) return;
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  window.Tawk_API.customStyle = {
    visibility: {
      desktop: { position: 'br', xOffset: 16, yOffset: 16 },
      mobile: { position: 'br', xOffset: 12, yOffset: 12 },
    },
  };
  const s1 = document.createElement('script');
  s1.id = 'tawk-to-script';
  s1.async = true;
  s1.src = TAWK_SRC;
  s1.charset = 'UTF-8';
  s1.setAttribute('crossorigin', '*');
  document.body.appendChild(s1);
}

function runWhenIdle(fn: () => void, timeoutMs = 4000) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => fn(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, Math.min(timeoutMs, 2500));
  return () => window.clearTimeout(id);
}

/**
 * Site content shows first. Chat button stays.
 * Welcome / shortcut cards are hidden on the page; they can still appear inside an open chat.
 */
export function TawkToChat() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin') || pathname === '/login';

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    const cancelIdle = runWhenIdle(() => {
      if (!cancelled) loadTawkScript();
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [isAdmin]);

  useEffect(() => {
    let userOpened = false;
    const observer = new MutationObserver(() => {
      if (!userOpened) hideExternalTawkOverlays();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const apply = () => {
      const api = window.Tawk_API;
      if (!api) return;
      if (isAdmin) {
        api.hideWidget?.();
        return;
      }
      api.showWidget?.();
      if (!userOpened) {
        api.minimize?.();
        hideExternalTawkOverlays();
      } else {
        restoreExternalTawkOverlays();
      }
    };

    apply();

    const api = window.Tawk_API || (window.Tawk_API = {});
    const prevLoad = api.onLoad;
    api.onLoad = () => {
      prevLoad?.();
      apply();
    };

    const prevMaximized = api.onChatMaximized;
    api.onChatMaximized = () => {
      prevMaximized?.();
      userOpened = true;
      restoreExternalTawkOverlays();
    };

    const prevMinimized = api.onChatMinimized;
    api.onChatMinimized = () => {
      prevMinimized?.();
      userOpened = false;
      hideExternalTawkOverlays();
    };

    const id = window.setInterval(apply, 600);

    return () => {
      observer.disconnect();
      window.clearInterval(id);
    };
  }, [isAdmin]);

  return null;
}
