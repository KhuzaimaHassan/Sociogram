import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const [email, setEmail] = useState('demo@sociogram.app');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-pink flex items-center justify-center mb-4 shadow-lg glow-brand">
            <span className="text-3xl">🎭</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Sociogram</h1>
          <p className="text-sm text-surface-400 mt-1">Welcome back. Let's see how you feel today.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-surface-300 mb-1.5">Email</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-surface-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-accent-rose/10 border border-accent-rose/30 text-xs text-accent-rose">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.98] disabled:opacity-50"
            id="login-submit"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-center text-xs text-surface-400 pt-1">
            New here?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Create an account
            </Link>
          </div>
        </form>

        <p className="text-center text-[11px] text-surface-500 mt-6">
          Demo credentials are pre-filled. The seed user is{' '}
          <code className="text-surface-400">demo@sociogram.app</code>.
        </p>
      </div>
    </div>
  );
}
