import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Tags,
  Users,
  Eye,
  Settings,
  Images,
  Wrench,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  House,
  PanelsTopLeft,
  Info,
  CircleHelp,
  LifeBuoy,
  FileText,
  RotateCcw,
  Moon,
  Sun,
  BarChart3,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { AdminThemeProvider, useAdminTheme } from '../contexts/AdminThemeContext';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import { cn } from '../utils/helpers';

const navItemsBeforeContent = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/visitors', label: 'Site Visits', icon: Eye },
  { href: '/admin/slides', label: 'Slide Management', icon: Images },
];

const siteContentItems = [
  { href: '/admin/content/homepage', label: 'Homepage', icon: House },
  { href: '/admin/content/footer', label: 'Footer', icon: PanelsTopLeft },
  { href: '/admin/content/about', label: 'About Page', icon: Info },
  { href: '/admin/content/faq', label: 'FAQ', icon: CircleHelp },
  { href: '/admin/content/support', label: 'Support Page', icon: LifeBuoy },
  { href: '/admin/content/terms', label: 'Terms & Conditions', icon: FileText },
  { href: '/admin/content/refund', label: 'Refund Policy', icon: RotateCcw },
];

const navItemsAfterContent = [
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
];

function AdminLayoutShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState<{
    label: string;
    top: number;
    showStateIcon?: boolean;
  } | null>(null);
  const [contentFlyoutTop, setContentFlyoutTop] = useState<number | null>(null);
  const { user, logout } = useAdminAuth();
  const { theme, toggleTheme, isDark } = useAdminTheme();
  const location = useLocation();
  useAdminRealtime();

  const contentMenuActive = location.pathname.startsWith('/admin/content');
  const [contentMenuOpen, setContentMenuOpen] = useState(contentMenuActive);

  useEffect(() => {
    if (contentMenuActive) setContentMenuOpen(true);
  }, [contentMenuActive]);

  const isActive = (href: string) =>
    href === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(href);

  const showTooltip = (
    event: React.MouseEvent<HTMLElement>,
    label: string,
    options?: { showStateIcon?: boolean },
  ) => {
    if (!collapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverTooltip({
      label,
      top: rect.top + rect.height / 2,
      showStateIcon: options?.showStateIcon,
    });
  };

  const hideTooltip = () => setHoverTooltip(null);

  const updateContentFlyoutPosition = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const estimatedFlyoutHeight = 360;
    const viewportPadding = 16;
    const nextTop = Math.max(
      viewportPadding,
      Math.min(rect.top, window.innerHeight - estimatedFlyoutHeight - viewportPadding),
    );
    setContentFlyoutTop(nextTop);
  };

  const closeFlyouts = () => {
    setContentMenuOpen(false);
    setContentFlyoutTop(null);
    hideTooltip();
  };

  const activeNavClass = isDark
    ? 'bg-[#2d1a0f] text-orange-100 shadow-[inset_4px_0_0_0_#FF6B00]'
    : 'bg-[#fff3eb] text-[#FF6B00] shadow-[inset_4px_0_0_0_#FF6B00]';

  const idleNavClass = isDark
    ? 'text-slate-400 hover:bg-[#2d1a0f]/50 hover:text-orange-100'
    : 'text-slate-600 hover:bg-[#fff3eb] hover:text-[#FF6B00]';

  const renderNavLink = (item: (typeof navItemsBeforeContent)[number]) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => {
          setMobileOpen(false);
          closeFlyouts();
        }}
        onMouseEnter={(e) => showTooltip(e, item.label)}
        onMouseLeave={hideTooltip}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          collapsed && 'lg:justify-center lg:px-0',
          isActive(item.href) ? activeNavClass : idleNavClass,
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'border-b',
          isDark ? 'border-[#18263b]' : 'border-slate-200',
          collapsed ? 'px-3 py-5' : 'p-6',
        )}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-3',
            collapsed && 'lg:flex-col lg:items-center lg:justify-start',
          )}
        >
          <div
            className={cn(
              'min-w-0',
              collapsed && 'lg:flex lg:w-full lg:flex-col lg:items-center lg:justify-center lg:gap-3',
            )}
          >
            <div className={cn(collapsed && 'lg:hidden')}>
              <p
                className={cn(
                  'text-[11px] font-semibold tracking-[0.18em] uppercase',
                  isDark ? 'text-amber-500/90' : 'text-[#FF6B00]',
                )}
              >
                Admin Panel
              </p>
              <Link
                to="/admin"
                className="mt-2 block font-display text-xl font-bold"
              >
                Ay <span className="text-[#FF6B00]">Food</span>
              </Link>
            </div>
            <Link
              to="/admin"
              className={cn(
                'hidden items-center justify-center rounded-2xl border p-2',
                isDark ? 'border-[#22324a] bg-[#081624]' : 'border-slate-200 bg-slate-100',
                collapsed && 'lg:inline-flex',
              )}
              title="Ay Food"
            >
              <UtensilsCrossed className="h-5 w-5 text-[#FF6B00]" />
            </Link>
          </div>

          {/* Circled in NexLogs: collapse control lives on the sidebar */}
          <button
            type="button"
            onClick={() => {
              hideTooltip();
              setContentFlyoutTop(null);
              setCollapsed((c) => !c);
            }}
            className={cn(
              'hidden h-9 w-9 items-center justify-center rounded-lg border transition-colors lg:inline-flex',
              collapsed && 'lg:order-first',
              isDark
                ? 'border-[#22324a] bg-[#0a1628] text-slate-200 hover:bg-[#10213a]'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md lg:hidden',
              isDark
                ? 'text-slate-400 hover:bg-[#0d1b2d] hover:text-slate-100'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
            )}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-x-visible overflow-y-auto p-3">
        {navItemsBeforeContent.map(renderNavLink)}

        <div className="relative space-y-1">
          <button
            type="button"
            onClick={(event) => {
              if (collapsed) {
                updateContentFlyoutPosition(event);
              } else {
                setContentFlyoutTop(null);
              }
              setContentMenuOpen((open) => !open);
              hideTooltip();
            }}
            onMouseEnter={(e) => showTooltip(e, 'Site Content', { showStateIcon: true })}
            onMouseLeave={hideTooltip}
            className={cn(
              'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              collapsed && 'lg:justify-center lg:px-0',
              contentMenuActive ? activeNavClass : idleNavClass,
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className={cn('truncate', collapsed && 'lg:hidden')}>Site Content</span>
            {contentMenuOpen ? (
              <ChevronUp className={cn('ml-auto h-4 w-4', collapsed && 'lg:hidden')} />
            ) : (
              <ChevronDown className={cn('ml-auto h-4 w-4', collapsed && 'lg:hidden')} />
            )}
          </button>

          {contentMenuOpen && !collapsed && (
            <div
              className={cn(
                'ml-3 max-h-80 space-y-1 overflow-y-auto rounded-2xl border px-2 py-2',
                isDark
                  ? 'border-[#18263b] bg-[#0a1628]'
                  : 'border-slate-200 bg-slate-50',
              )}
            >
              {siteContentItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => {
                      setMobileOpen(false);
                      setContentFlyoutTop(null);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      active ? activeNavClass : idleNavClass,
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {navItemsAfterContent.map(renderNavLink)}
      </nav>

      <div className={cn('border-t p-3', isDark ? 'border-[#18263b]' : 'border-slate-200')}>
        {!collapsed && (
          <p className={cn('mb-2 truncate px-2 text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
            {user?.firstName} {user?.lastName}
            <span className="text-slate-400"> (Admin)</span>
          </p>
        )}
        <button
          type="button"
          onClick={logout}
          onMouseEnter={(e) => showTooltip(e, 'Sign out')}
          onMouseLeave={hideTooltip}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
            collapsed && 'lg:justify-center lg:px-0',
            idleNavClass,
          )}
        >
          <LogOut className="h-4 w-4" />
          <span className={cn(collapsed && 'lg:hidden')}>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      data-admin-theme={theme}
      className={cn(
        'admin-shell min-h-screen transition-colors',
        isDark ? 'bg-[#040b16] text-slate-100' : 'bg-[#f5f7fb] text-slate-900',
      )}
    >
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 overflow-visible border-r transition-[width,transform,background-color,border-color] duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-64 lg:w-20' : 'w-64',
          isDark
            ? 'border-[#18263b] bg-[#050d19] text-slate-100'
            : 'border-slate-200 bg-white text-slate-900 shadow-sm',
        )}
      >
        {sidebar}
      </aside>

      {hoverTooltip && collapsed && (
        <div
          className={cn(
            'pointer-events-none fixed left-[88px] z-80 hidden -translate-y-1/2 rounded-md border px-2.5 py-1.5 text-xs shadow-lg lg:flex',
            isDark
              ? 'border-[#22324a] bg-[#0a1628] text-white'
              : 'border-slate-200 bg-white text-slate-800',
          )}
          style={{ top: hoverTooltip.top }}
        >
          <span className="whitespace-nowrap">{hoverTooltip.label}</span>
        </div>
      )}

      {contentMenuOpen && collapsed && contentFlyoutTop !== null && (
        <div
          className={cn(
            'fixed left-[92px] z-80 hidden w-56 rounded-2xl border p-2 shadow-xl lg:block',
            isDark ? 'border-[#22324a] bg-[#0a1628]' : 'border-slate-200 bg-white',
          )}
          style={{ top: contentFlyoutTop }}
        >
          <p className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Site Content
          </p>
          {siteContentItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={closeFlyouts}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  active ? activeNavClass : idleNavClass,
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header
          className={cn(
            'sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur lg:px-8',
            isDark
              ? 'border-[#18263b] bg-[#07111f]/95'
              : 'border-slate-200 bg-white/95',
          )}
        >
          <button
            type="button"
            className={cn(
              'rounded-lg border p-2 lg:hidden',
              isDark
                ? 'border-[#22324a] bg-[#0a1628] text-slate-200 hover:bg-[#10213a]'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1
            className={cn(
              'font-display text-xl font-semibold',
              isDark ? 'text-slate-50' : 'text-slate-900',
            )}
          >
            Admin Dashboard
          </h1>
          <div className="flex-1" />

          {/* Circled in NexLogs: Light Mode / Dark Mode toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              isDark
                ? 'border-[#22324a] bg-[#0a1628] text-slate-100 hover:bg-[#10213a]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
            )}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          <Link
            to="/"
            className={cn(
              'hidden text-xs sm:inline',
              isDark ? 'text-slate-400 hover:text-[#FF6B00]' : 'text-slate-500 hover:text-[#FF6B00]',
            )}
          >
            View site
          </Link>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutShell />
    </AdminThemeProvider>
  );
}
