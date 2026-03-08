import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../lib/firebase';
import { getOrCreateFactorForCustomer } from '../lib/factor';
import { useAuth } from './AuthContext';
import { LanguageSelector } from '../components/LanguageSelector';

export function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // After signup, Firebase signs the user in; once AuthContext has the user, go straight to app (no sign-in step).
  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'admin' ? '/admin' : '/app', { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const trimmedEmail = email.trim();
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      if (name.trim()) await updateProfile(firebaseUser, { displayName: name.trim() });

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: name.trim(),
        email: trimmedEmail.toLowerCase(),
        role: 'customer',
        createdAt: new Date().toISOString(),
      });

      await getOrCreateFactorForCustomer(firebaseUser.uid);
      // Do not navigate here: AuthContext will get the user from onAuthStateChanged, then the effect above will redirect.
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        setError(t('signup_error_email_in_use'));
      } else {
        setError(t('signup_error_generic'));
      }
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
              aria-label="Back to sign in"
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
                {t('signup_title')}
              </h1>
            </div>
            <p className="mt-3 text-sm text-neutral-600">
              {t('signup_subtitle')}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                  {t('auth_full_name_label')}
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black"
                />
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
              {submitting ? t('signup_submit_loading') : t('signup_submit_default')}
            </button>

            <p className="mt-4 text-center text-xs text-neutral-500">
              {t('auth_already_have_account')}{' '}
              <Link to="/login" className="font-medium text-black underline underline-offset-2 hover:no-underline">
                {t('auth_sign_in_link')}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
