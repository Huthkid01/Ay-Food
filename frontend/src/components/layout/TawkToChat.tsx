import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    Tawk_API?: {
      autoStart?: boolean;
      hideWidget?: () => void;
      showWidget?: () => void;
      minimize?: () => void;
      start?: (options?: { showWidget?: boolean }) => void;
      onLoad?: () => void;
      onChatMaximized?: () => void;
      onChatMinimized?: () => void;
      customStyle?: Record<string, unknown>;
    };
    Tawk_LoadStart?: Date;
  }
}

const TAWK_SRC = 'https://embed.tawk.to/6a65570b15ab181d4e3c7bf2/1judto3bv';
const PREVIEW_STYLE_ID = 'tawk-hide-greeting-preview';

function hideTawkPreviewBubbles() {
  document.querySelectorAll('iframe').forEach((iframe) => {
    const title = (iframe.getAttribute('title') || '').toLowerCase();
    const name = (iframe.getAttribute('name') || '').toLowerCase();
    const id = (iframe.id || '').toLowerCase();
    const src = (iframe.getAttribute('src') || '').toLowerCase();
    const isTawk =
      src.includes('tawk') ||
      id.includes('tawk') ||
      name.includes('tawk') ||
      title.includes('chat') ||
      title.includes('tawk');
    const isPreview =
      title.includes('bubble') ||
      title.includes('preview') ||
      title.includes('popup') ||
      title.includes('greeting') ||
      title.includes('message from') ||
      title.includes('attention') ||
      title.includes('we are here') ||
      name.includes('bubble') ||
      id.includes('bubble');

    const rect = iframe.getBoundingClientRect();
    // Tawk attention grabber ("We are here") is a wide short image beside the round button.
    const isAttentionGrabber =
      isTawk && rect.width > 90 && rect.height > 0 && rect.height < 90;

    if (!isPreview && !isAttentionGrabber) return;
    iframe.style.setProperty('display', 'none', 'important');
    iframe.style.setProperty('visibility', 'hidden', 'important');
    iframe.style.setProperty('pointer-events', 'none', 'important');
    iframe.style.setProperty('opacity', '0', 'important');
  });
}

function injectPreviewCss() {
  if (document.getElementById(PREVIEW_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PREVIEW_STYLE_ID;
  style.textContent = `
    iframe[title*="bubble" i],
    iframe[title*="preview" i],
    iframe[title*="popup" i],
    iframe[title*="greeting" i],
    iframe[title*="message from" i],
    iframe[title*="attention" i],
    iframe[title*="we are here" i] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      opacity: 0 !important;
      width: 0 !important;
      height: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function loadTawkScript() {
  if (document.getElementById('tawk-to-script')) return;
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  // Do not auto-connect: Tawk triggers fire the welcome popup as soon as the socket starts.
  window.Tawk_API.autoStart = false;
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
 * Loads Tawk after first paint so the site content shows first.
 * Keeps the chat button, but does not auto-open the welcome popup.
 */
export function TawkToChat() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin') || pathname === '/login';
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    injectPreviewCss();
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
    let connected = false;
    let userOpened = false;
    const observer = new MutationObserver(() => hideTawkPreviewBubbles());
    observer.observe(document.body, { childList: true, subtree: true });

    const apply = () => {
      const api = window.Tawk_API;
      if (!api) return;
      if (isAdmin) {
        api.hideWidget?.();
        return;
      }
      api.showWidget?.();
      if (!userOpened) api.minimize?.();
      hideTawkPreviewBubbles();
    };

    apply();

    const api = window.Tawk_API || (window.Tawk_API = {});
    const prevLoad = api.onLoad;
    api.onLoad = () => {
      prevLoad?.();
      if (!isAdmin && !connected) {
        connected = true;
        api.start?.({ showWidget: true });
      }
      apply();
    };

    const prevMaximized = api.onChatMaximized;
    api.onChatMaximized = () => {
      prevMaximized?.();
      userOpened = true;
      setChatOpen(true);
    };

    const prevMinimized = api.onChatMinimized;
    api.onChatMinimized = () => {
      prevMinimized?.();
      setChatOpen(false);
    };

    const id = window.setInterval(apply, 400);
    const stop = window.setTimeout(() => window.clearInterval(id), 8000);

    return () => {
      observer.disconnect();
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [isAdmin]);

  if (isAdmin || chatOpen) return null;

  return (
    <div
      className="pointer-events-none fixed z-[2147483000] max-w-[7.5rem] text-right"
      style={{
        right: 'max(0.75rem, env(safe-area-inset-right))',
        bottom: 'calc(4.75rem + env(safe-area-inset-bottom))',
      }}
    >
      <span className="inline-block rounded-full bg-brand-gold px-2.5 py-1 text-[11px] font-semibold leading-tight text-white shadow-lg">
        Customer support
      </span>
    </div>
  );
}
