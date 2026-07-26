import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { resetAdminThemeForLogin } from '../../contexts/AdminThemeContext';
import { BrandLogo } from '../../components/ui/BrandLogo';

const adminDepartments = [
  'Kitchen',
  'Manager',
  'Cashier',
  'Delivery',
  'Owner',
  'Accounting',
] as const;

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await login(email, password);
      if (department) {
        try {
          sessionStorage.setItem('ay-food-admin-department', department);
        } catch {
          // ignore
        }
      }
      resetAdminThemeForLogin();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#faf6f2_0%,#f4f4f5_50%,#eceef1_100%)] px-4 py-10 text-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <BrandLogo size="lg" tone="light" />
          </div>
          <p className="text-sm text-gray-500">Admin Dashboard Access</p>
        </div>

        <div className="rounded-3xl border border-gray-200/80 bg-white p-7 shadow-xl shadow-black/5">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fff4ec] px-4 py-2 text-xs font-semibold text-brand-gold-dark">
              <Shield className="h-3.5 w-3.5 text-brand-gold" />
              Secure Admin Access
            </span>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-brand-gold/40"
                placeholder="Enter your email"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-lg border border-gray-200 bg-white py-3 pr-12 pl-10 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-brand-gold/40"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="admin-department" className="mb-2 block text-sm font-medium text-gray-700">
                Department
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  id="admin-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="flex h-12 w-full appearance-none rounded-lg border border-gray-200 bg-white pr-10 pl-10 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-brand-gold/40"
                >
                  <option value="">Select your department</option>
                  {adminDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-gold px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-gold-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-brand-gold">
            Back to public website
          </Link>
        </div>
      </div>
    </div>
  );
}
