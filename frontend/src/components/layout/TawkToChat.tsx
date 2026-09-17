import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      minimize?: () => void;
      maximize?: () => void;
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
const STYLE_ID = 'ay-tawk-hide-outside-popups';
const CATCHER_ID = 'ay-tawk-open-catcher';

function isTawkIframe(iframe: HTMLIFrameElement) {
  const title = (iframe.getAttribute('title') || '').toLowerCase();
  const name = (iframe.getAttribute('name') || '').toLowerCase();
  const id = (iframe.id || '').toLowerCase();
  const src = (iframe.getAttribute('src') || '').toLowerCase();
  const parentId = (iframe.parentElement?.id || '').toLowerCase();
  const parentClass = (iframe.parentElement?.className || '').toString().toLowerCase();
  return (
    src.includes('tawk') ||
    id.includes('tawk') ||
    name.includes('tawk') ||
    title.includes('tawk') ||
    title.includes('chat') ||
    parentId.includes('tawk') ||
    parentClass.includes('tawk')
  );
}

function hideOverlay(el: HTMLElement) {
  el.setAttribute(HIDDEN_ATTR, '1');
  el.style.setProperty('display', 'none', 'important');
  el.style.setProperty('visibility', 'hidden', 'important');
  el.style.setProperty('pointer-events', 'none', 'important');
  el.style.setProperty('opacity', '0', 'important');
}

function restoreOverlay(el: HTMLElement) {
  if (!el.hasAttribute(HIDDEN_ATTR)) return;
  el.removeAttribute(HIDDEN_ATTR);
  el.style.removeProperty('display');
  el.style.removeProperty('visibility');
  el.style.removeProperty('pointer-events');
  el.style.removeProperty('opacity');
}

function isLauncherRect(rect: DOMRect) {
  return rect.width > 8 && rect.width <= 90 && rect.height > 8 && rect.height <= 90;
}

function isFullChatRect(rect: DOMRect) {
  return rect.width >= 300 && rect.height >= 380;
}

function isPagePopupRect(rect: DOMRect) {
  if (rect.width < 1 || rect.height < 1) return false;
  if (isLauncherRect(rect)) return false;
  return (
    rect.right > window.innerWidth - 440 &&
    rect.bottom > window.innerHeight - 520 &&
    (rect.width > 90 || rect.height > 90)
  );
}

function findLauncherIframe() {
  return [...document.querySelectorAll('iframe')].find((node) => {
    const iframe = node as HTMLIFrameElement;
    const rect = iframe.getBoundingClientRect();
    return isLauncherRect(rect) && (isTawkIframe(iframe) || rect.right > window.innerWidth - 140);
  }) as HTMLIFrameElement | undefined;
}

/**
 * Keep the round button. Hide welcome / shortcut cards that sit on the page.
 * Do not hide the main widget iframe when it is the only Tawk frame and currently maximized —
 * Tawk_API.minimize() shrinks that one back into the button.
 */
function hideExternalTawkOverlays() {
  const iframes = [...document.querySelectorAll('iframe')] as HTMLIFrameElement[];
  const hasLauncher = Boolean(findLauncherIframe());

  iframes.forEach((iframe) => {
    const rect = iframe.getBoundingClientRect();
    if (isLauncherRect(rect)) {
      restoreOverlay(iframe);
      return;
    }

    const tawk = isTawkIframe(iframe);
    const popup = isPagePopupRect(rect);
    if (!tawk && !popup) return;

    if (!hasLauncher && tawk && isFullChatRect(rect)) {
      restoreOverlay(iframe);
      return;
    }

    hideOverlay(iframe);
  });
}

function restoreExternalTawkOverlays() {
  document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach((node) => {
    restoreOverlay(node as HTMLElement);
  });
}

function injectHideCss() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    iframe[title*="preview" i],
    iframe[title*="bubble" i],
    iframe[title*="popup" i],
    iframe[title*="attention" i],
    iframe[title*="we are here" i],
    #tawkchat-status-bubble,
    #tawkchat-message-preview,
    .tawk-min-container iframe + iframe {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(style);
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

function ensureCatcher(onOpen: () => void) {
  let catcher = document.getElementById(CATCHER_ID) as HTMLButtonElement | null;
  if (!catcher) {
    catcher = document.createElement('button');
    catcher.id = CATCHER_ID;
    catcher.type = 'button';
    catcher.setAttribute('aria-label', 'Open chat');
    catcher.style.cssText =
      'position:fixed;z-index:2147483646;padding:0;margin:0;border:0;background:transparent;cursor:pointer;';
    document.body.appendChild(catcher);
  }
  catcher.onclick = onOpen;
  return catcher;
}

function syncCatcher(catcher: HTMLButtonElement, userOpened: boolean, isAdmin: boolean) {
  if (userOpened || isAdmin) {
    catcher.style.display = 'none';
    return;
  }

  const launcher = findLauncherIframe();
  const size = 64;
  const xOffset = 16;
  const yOffset = 16;
  const rect = launcher
    ? launcher.getBoundingClientRect()
    : new DOMRect(window.innerWidth - size - xOffset, window.innerHeight - size - yOffset, size, size);

  catcher.style.display = 'block';
  catcher.style.left = `${Math.round(rect.left)}px`;
  catcher.style.top = `${Math.round(rect.top)}px`;
  catcher.style.width = `${Math.round(rect.width)}px`;
  catcher.style.height = `${Math.round(rect.height)}px`;
}

/**
 * Site content shows first. Chat button stays.
 * Welcome / shortcut cards must not sit on the page, including after leaving and coming back.
 * Full chat opens only when the visitor clicks the button.
 */
export function TawkToChat() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin') || pathname === '/login';

  useEffect(() => {
    if (isAdmin) return;
    injectHideCss();
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
    let burstTimer = 0;
    let burstUntil = 0;
    let raf = 0;

    const catcher = ensureCatcher(() => {
      userOpened = true;
      catcher.style.display = 'none';
      restoreExternalTawkOverlays();
      window.Tawk_API?.showWidget?.();
      window.Tawk_API?.maximize?.();
    });

    const collapseToButton = () => {
      userOpened = false;
      window.Tawk_API?.minimize?.();
      hideExternalTawkOverlays();
      syncCatcher(catcher, userOpened, isAdmin);
    };

    const burstCollapse = (ms = 2500) => {
      burstUntil = Date.now() + ms;
      const tick = () => {
        if (userOpened) return;
        collapseToButton();
        if (Date.now() < burstUntil) {
          raf = window.requestAnimationFrame(tick);
        }
      };
      window.cancelAnimationFrame(raf);
      window.clearTimeout(burstTimer);
      tick();
      burstTimer = window.setTimeout(() => collapseToButton(), ms);
    };

    const observer = new MutationObserver(() => {
      if (!userOpened) hideExternalTawkOverlays();
      syncCatcher(catcher, userOpened, isAdmin);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    const apply = () => {
      const api = window.Tawk_API;
      if (!api) {
        syncCatcher(catcher, userOpened, isAdmin);
        return;
      }
      if (isAdmin) {
        api.hideWidget?.();
        catcher.style.display = 'none';
        return;
      }
      api.showWidget?.();
      if (!userOpened) {
        api.minimize?.();
        hideExternalTawkOverlays();
      } else {
        restoreExternalTawkOverlays();
      }
      syncCatcher(catcher, userOpened, isAdmin);
    };

    apply();

    const api = window.Tawk_API || (window.Tawk_API = {});
    const prevLoad = api.onLoad;
    api.onLoad = () => {
      prevLoad?.();
      burstCollapse(2000);
    };

    const prevMaximized = api.onChatMaximized;
    api.onChatMaximized = () => {
      prevMaximized?.();
      if (!userOpened) {
        collapseToButton();
        return;
      }
      restoreExternalTawkOverlays();
      syncCatcher(catcher, userOpened, isAdmin);
    };

    const prevMinimized = api.onChatMinimized;
    api.onChatMinimized = () => {
      prevMinimized?.();
      collapseToButton();
    };

    const onReturnToPage = () => {
      burstCollapse(3000);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') onReturnToPage();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onReturnToPage);
    window.addEventListener('resize', apply);

    const id = window.setInterval(apply, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(id);
      window.clearTimeout(burstTimer);
      window.cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onReturnToPage);
      window.removeEventListener('resize', apply);
      catcher.remove();
    };
  }, [isAdmin]);

  return null;
}
