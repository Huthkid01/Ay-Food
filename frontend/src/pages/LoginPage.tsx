import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [error, setError] = useState('');

  const auth = useMutation({
    mutationFn: () =>
      isRegister
        ? authApi.register(form).then((r) => r.data)
        : authApi.login({ email: form.email, password: form.password }).then((r) => r.data),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      if (data.user.role === 'OWNER' || data.user.role === 'MANAGER') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    },
    onError: () => setError('Invalid credentials or email already exists'),
  });

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-white/10 bg-brand-dark-light p-8">
        <h1 className="mb-2 text-center font-display text-2xl font-bold">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="mb-6 text-center text-sm text-white/60">
          {isRegister ? 'Join Ay Food to track orders & save favorites' : 'Sign in to your account'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            auth.mutate();
          }}
          className="space-y-4"
        >
          {isRegister && (
            <>
              <input
                placeholder="First Name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
                required
              />
              <input
                placeholder="Last Name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
                required
              />
              <input
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
            required
            minLength={8}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={auth.isPending}
            className="w-full rounded-full bg-brand-gold py-3 font-semibold text-white disabled:opacity-50"
          >
            {auth.isPending ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-white/60">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsRegister(!isRegister)} className="text-brand-gold hover:underline">
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </p>

        {!isRegister && (
          <p className="mt-4 text-center text-xs text-white/40">
          Demo admin: contact@ayfoodpalace.com
          </p>
        )}

        <Link to="/" className="mt-4 block text-center text-sm text-white/50 hover:text-brand-gold">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
