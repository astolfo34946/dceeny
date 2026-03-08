import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../lib/firebase';
import { LanguageSelector } from '../components/LanguageSelector';

function getErrorMessage(code: string | undefined, t: (key: string) => string): string {
  switch (code) {
    case 'auth/invalid-email':
      return t('forgot_password_error_invalid_email');
    case 'auth/user-not-found':
      return t('forgot_password_error_user_not_found');
    case 'auth/network-request-failed':
      return t('forgot_password_error_network');
    default:
      return t('forgot_password_error_generic');
  }
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('forgot_password_error_invalid_email'));
      setSubmitting(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSuccess(true);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(getErrorMessage(code, t));
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
              to="/login"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition-colors hover:border-black hover:text-black"
              aria-label={t('header_aria_back')}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>

          <div
            className="rounded-xl border border-white bg-black p-6 shadow-lg transition-opacity duration-200"
            style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
          >
            {success ? (
              <div className="transition-opacity duration-200">
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  {t('forgot_password_success_title')}
                </h1>
                <p className="mt-3 text-sm text-neutral-300">
                  {t('forgot_password_success_description')}
                </p>
                <Link
                  to="/login"
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white bg-white text-sm font-medium uppercase tracking-wider text-black transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('forgot_password_return_login')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="transition-opacity duration-150">
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  {t('forgot_password_title')}
                </h1>
                <p className="mt-2 text-sm text-neutral-300">
                  {t('forgot_password_description')}
                </p>

                <div className="mt-5">
                  <label htmlFor="forgot-email" className="sr-only">
                    {t('auth_email_label')}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </span>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth_email_label')}
                      className="w-full rounded-lg border border-neutral-600 bg-neutral-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-white focus:ring-1 focus:ring-white"
                    />
                  </div>
                </div>

                {error && (
                  <p className="mt-3 text-sm text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white bg-white text-sm font-medium uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  {submitting ? t('forgot_password_sending') : t('forgot_password_send_button')}
                </button>

                <Link
                  to="/login"
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-neutral-600 bg-transparent text-sm font-medium uppercase tracking-wider text-white transition-colors hover:border-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('forgot_password_back_login')}
                </Link>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
