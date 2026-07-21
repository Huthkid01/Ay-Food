export function NotificationBanner() {
  const text =
    'Order now, pay now and get your meals delivered • Fresh Nigerian cuisine in Ogijo, Ikorodu • Order now, pay now and get your meals delivered';

  return (
    <div className="overflow-hidden border-b-2 border-brand-gold bg-brand-gold py-2 text-white">
      <div className="animate-scroll-banner whitespace-nowrap text-sm font-medium">
        {text} • {text}
      </div>
    </div>
  );
}
