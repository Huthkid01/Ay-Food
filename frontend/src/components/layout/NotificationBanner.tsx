import { useSiteContentData } from '../../hooks/useSiteContent';

export function NotificationBanner() {
  const { banner } = useSiteContentData();
  if (!banner.enabled || !banner.text.trim()) return null;

  const text = banner.text.trim();
  const segment = `${text}  ·  ${text}  ·  `;

  return (
    <div className="overflow-hidden border-b border-brand-subtle bg-[#161210] py-2 text-brand-gold/85">
      <div className="animate-scroll-banner whitespace-nowrap text-xs font-medium tracking-wide sm:text-sm">
        <span>{segment}</span>
        <span aria-hidden="true">{segment}</span>
      </div>
    </div>
  );
}
