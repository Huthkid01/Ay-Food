import { useSiteContentData } from '../../hooks/useSiteContent';

export function NotificationBanner() {
  const { banner } = useSiteContentData();
  if (!banner.enabled || !banner.text.trim()) return null;

  const text = banner.text.trim();
  // Repeat so the marquee never shows a gap while scrolling
  const segment = `${text}  •  ${text}  •  `;

  return (
    <div className="overflow-hidden border-b-2 border-brand-gold bg-brand-gold py-2 text-white">
      <div className="animate-scroll-banner whitespace-nowrap text-sm font-medium">
        <span>{segment}</span>
        <span aria-hidden="true">{segment}</span>
      </div>
    </div>
  );
}
