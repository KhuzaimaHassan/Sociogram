import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const USERNAME_RE = /^[a-zA-Z0-9._]+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    if (form.username.length < 3 || form.username.length > 30) {
      return 'Username must be 3–30 characters.';
    }
    if (!USERNAME_RE.test(form.username)) {
      return 'Username can only contain letters, numbers, dots, and underscores.';
    }
    if (form.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        displayName: form.displayName.trim() || form.username.trim(),
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-pink flex items-center justify-center mb-4 shadow-lg glow-brand">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Join Sociogram</h1>
          <p className="text-sm text-surface-400 mt-1">React with your face. Privacy-first by design.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">Username</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                placeholder="cool.handle"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">Display name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                placeholder="Your name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
              placeholder="At least 6 characters"
            />
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
            id="register-submit"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>

          <div className="text-center text-xs text-surface-400 pt-1">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
