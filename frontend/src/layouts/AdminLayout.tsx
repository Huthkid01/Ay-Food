import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Tags,
  Users,
  Eye,
  Images,
  Wrench,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  LayoutTemplate,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { AdminThemeProvider, useAdminTheme } from '../contexts/AdminThemeContext';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import { BrandLogo } from '../components/ui/BrandLogo';
import { cn } from '../utils/helpers';

const navItemsBeforeContent = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/visitors', label: 'Site Visits', icon: Eye },
];

/** Nested under Content Management (I-Coffee style). */
const contentManagementItems = [
  { href: '/admin/slides', label: 'Slider Management', icon: Images },
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

  const contentMenuActive =
    location.pathname.startsWith('/admin/content') ||
    location.pathname.startsWith('/admin/slides');
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
    const estimatedFlyoutHeight = 420;
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
    ? 'bg-[#2a1a12] text-orange-50 shadow-[inset_3px_0_0_0_var(--color-brand-gold)]'
    : 'bg-[#fff4ec] text-brand-gold shadow-[inset_3px_0_0_0_var(--color-brand-gold)]';

  const idleNavClass = isDark
    ? 'text-slate-400 hover:bg-[#2a1a12]/60 hover:text-orange-50'
    : 'text-slate-600 hover:bg-[#fff4ec] hover:text-brand-gold';

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

  const renderContentChild = (item: (typeof contentManagementItems)[number]) => {
    const Icon = item.icon;
    const active =
      item.href === '/admin/slides'
        ? location.pathname.startsWith('/admin/slides')
        : location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => {
          setMobileOpen(false);
          setContentFlyoutTop(null);
        }}
        className={cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          active ? activeNavClass : idleNavClass,
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'border-b',
          isDark ? 'border-[#18263b]' : 'border-slate-200',
          collapsed ? 'px-3 py-5' : 'p-5',
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
              <Link to="/admin" className="block">
                <BrandLogo size="sm" tone={isDark ? 'dark' : 'light'} />
              </Link>
              <p className="mt-2 text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                Admin Panel
              </p>
            </div>
            <Link
              to="/admin"
              className={cn('hidden', collapsed && 'lg:inline-flex')}
              title="Ay Food"
            >
              <BrandLogo size="sm" showWordmark={false} />
            </Link>
          </div>

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

        {!collapsed && (
          <div
            className={cn(
              'mt-4 flex items-center gap-3 rounded-xl border px-3 py-2.5',
              isDark ? 'border-[#18263b] bg-[#081624]' : 'border-slate-200 bg-slate-50',
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold text-sm font-bold text-white">
              {(user?.firstName?.[0] || 'A').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">Logged in as</p>
              <p className="truncate text-sm font-semibold uppercase tracking-wide">
                {user?.firstName || 'Ay Food'} {user?.lastName || 'Admin'}
              </p>
            </div>
          </div>
        )}
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
            onMouseEnter={(e) => showTooltip(e, 'Content Management', { showStateIcon: true })}
            onMouseLeave={hideTooltip}
            className={cn(
              'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              collapsed && 'lg:justify-center lg:px-0',
              contentMenuActive ? activeNavClass : idleNavClass,
            )}
          >
            <LayoutTemplate className="h-4 w-4 shrink-0" />
            <span className={cn('truncate', collapsed && 'lg:hidden')}>Content Management</span>
            {contentMenuOpen ? (
              <ChevronDown className={cn('ml-auto h-4 w-4', collapsed && 'lg:hidden')} />
            ) : (
              <ChevronRight className={cn('ml-auto h-4 w-4', collapsed && 'lg:hidden')} />
            )}
          </button>

          {contentMenuOpen && !collapsed && (
            <div className="ml-2 space-y-0.5 border-l border-white/10 pl-2">
              {contentManagementItems.map(renderContentChild)}
            </div>
          )}
        </div>

        {navItemsAfterContent.map(renderNavLink)}
      </nav>

      <div className={cn('border-t p-3', isDark ? 'border-[#18263b]' : 'border-slate-200')}>
        {!collapsed && (
          <p className={cn('mb-2 px-2 text-[11px]', isDark ? 'text-slate-500' : 'text-slate-500')}>
            v1.0.0 · Ay Food
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
            Content Management
          </p>
          {contentManagementItems.map(renderContentChild)}
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
              isDark ? 'text-slate-400 hover:text-brand-gold' : 'text-slate-500 hover:text-brand-gold',
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
