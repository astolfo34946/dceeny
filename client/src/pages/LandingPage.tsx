import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { LanguageSelector } from '../components/LanguageSelector';

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/app', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-end px-4 pt-4">
        <LanguageSelector />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <img src="/logo.ico" alt="" className="mx-auto mb-6 h-16 w-16 object-contain" />
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            {t('landing_title')}
          </h1>
          <p className="mt-3 text-sm text-neutral-600">
            {t('landing_subtitle')}
          </p>
          <div className="mt-10 flex flex-col gap-3">
            <Link
              to="/login"
              className="flex h-12 items-center justify-center rounded-xl border border-black bg-black text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {t('landing_sign_in')}
            </Link>
            <Link
              to="/signup"
              className="flex h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white text-sm font-medium text-black transition-colors hover:bg-neutral-50"
            >
              {t('landing_create_account')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
