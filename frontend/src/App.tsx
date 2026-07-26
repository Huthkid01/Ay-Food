import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from './contexts/CartContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { ToastProvider } from './components/ui/Toast';
import { useSiteRealtime } from './hooks/useSiteRealtime';
import { useSiteVisitTracking } from './hooks/useSiteVisitTracking';
import { getAdminToken } from './lib/admin-rpc';
import { SeoManager } from './components/SeoManager';
import { Header, Footer } from './components/layout/Header';
import { FloatingCart } from './components/layout/FloatingCart';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { MaintenanceGate } from './components/layout/MaintenanceGate';
import { NotificationBanner } from './components/layout/NotificationBanner';
import { TawkToChat } from './components/layout/TawkToChat';
import HomePage from './pages/HomePage';
import { AdminProtectedRoute, AdminGuestRoute } from './routes/AdminRoutes';

const MenuPage = lazy(() => import('./pages/MenuPage'));
const BuildPackPage = lazy(() => import('./pages/BuildPackPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminMenuPage = lazy(() => import('./pages/admin/AdminMenuPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'));
const AdminVisitorsPage = lazy(() => import('./pages/admin/AdminVisitorsPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminMaintenancePage = lazy(() => import('./pages/admin/AdminMaintenancePage'));
const AdminContentPage = lazy(() => import('./pages/admin/AdminContentPage'));
const AdminSlidesPage = lazy(() => import('./pages/admin/AdminSlidesPage'));
const FormSubmitOkPage = lazy(() => import('./pages/FormSubmitOkPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <NotificationBanner />
      <main className="flex-1">
        <MaintenanceGate>
          <Suspense fallback={<PageFallback />}>{children}</Suspense>
        </MaintenanceGate>
      </main>
      <Footer />
      <FloatingCart />
    </div>
  );
}

function SiteBridges() {
  const { isAdmin, loading } = useAdminAuth();
  const location = useLocation();
  useSiteRealtime();
  useSiteVisitTracking({
    skip:
      loading ||
      isAdmin ||
      !!getAdminToken() ||
      location.pathname.startsWith('/admin'),
  });
  return (
    <>
      <SeoManager />
      <TawkToChat />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AdminAuthProvider>
              <SiteBridges />
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Layout><HomePage /></Layout>} />
                  <Route path="/menu" element={<Layout><MenuPage /></Layout>} />
                  <Route path="/build" element={<Layout><BuildPackPage /></Layout>} />
                  <Route path="/cart" element={<Layout><CartPage /></Layout>} />
                  <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
                  <Route path="/track" element={<Layout><TrackOrderPage /></Layout>} />
                  <Route path="/about" element={<Layout><InfoPage /></Layout>} />
                  <Route path="/faq" element={<Layout><InfoPage /></Layout>} />
                  <Route path="/support" element={<Layout><InfoPage /></Layout>} />
                  <Route path="/terms" element={<Layout><InfoPage /></Layout>} />
                  <Route path="/refund" element={<Layout><InfoPage /></Layout>} />
                  <Route path="/formsubmit-ok" element={<FormSubmitOkPage />} />
                  <Route path="/login" element={<Navigate to="/admin/login" replace />} />

                  <Route path="/admin/login" element={<AdminGuestRoute />}>
                    <Route index element={<AdminLoginPage />} />
                  </Route>

                  <Route path="/admin" element={<AdminProtectedRoute />}>
                    <Route element={<AdminLayout />}>
                      <Route index element={<AdminDashboardPage />} />
                      <Route path="analytics" element={<AdminAnalyticsPage />} />
                      <Route path="orders" element={<AdminOrdersPage />} />
                      <Route path="menu" element={<AdminMenuPage />} />
                      <Route path="categories" element={<AdminCategoriesPage />} />
                      <Route path="customers" element={<AdminCustomersPage />} />
                      <Route path="visitors" element={<AdminVisitorsPage />} />
                      <Route path="slides" element={<AdminSlidesPage />} />
                      <Route path="content" element={<Navigate to="/admin/content/homepage" replace />} />
                      <Route path="content/:section" element={<AdminContentPage />} />
                      <Route path="site-content" element={<Navigate to="/admin/content/homepage" replace />} />
                      <Route path="maintenance" element={<AdminMaintenancePage />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </AdminAuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}
