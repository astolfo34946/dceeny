import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { LanguageSelector } from '../components/LanguageSelector';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  useEffect(() => {
    if (!user) return;
    const target = from ?? (user.role === 'admin' ? '/admin' : '/app');
    navigate(target, { replace: true });
  }, [user, navigate, from]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const target = from ?? (email.trim().toLowerCase().includes('admin') ? '/admin' : '/app');
      navigate(target, { replace: true });
    } catch (err) {
      setError(t('login_error_invalid_credentials'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-end px-4 pt-4">
        <LanguageSelector />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition-colors hover:border-black hover:text-black"
              aria-label="Back"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3">
              <img src="/logo.ico" alt="" className="h-12 w-12 object-contain" />
              <h1 className="text-xl font-semibold tracking-tight text-black">
                {t('login_title')}
              </h1>
            </div>
            <p className="mt-3 text-sm text-neutral-600">
              {t('login_subtitle')}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                  {t('auth_email_label')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                  {t('auth_password_label')}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black"
                />
                <div className="mt-1.5 text-left">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-neutral-600 transition-colors hover:text-black hover:underline cursor-pointer"
                  >
                    {t('forgot_password_link')}
                  </Link>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border border-black bg-black text-sm font-medium uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? t('login_submit_loading') : t('login_submit_default')}
            </button>

            <p className="mt-4 text-center text-xs text-neutral-500">
              {t('auth_new_client')}{' '}
              <Link to="/signup" className="font-medium text-black underline underline-offset-2 hover:no-underline">
                {t('auth_create_account_link')}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
