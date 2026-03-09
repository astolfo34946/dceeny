import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { LanguageSelector } from './LanguageSelector';

/** Return the logical "page before" (parent route) for the current path, or null if at a root. */
function getBackPath(pathname: string): string | null {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/admin' || path === '/app') return null;
  if (path.startsWith('/admin/customers/') && path.includes('/factor')) return '/admin/customers';
  if (path.startsWith('/admin/projects/') && path.includes('/weeks')) return '/admin/projects';
  if (path.startsWith('/admin/3d/') && path.includes('/scenes')) return '/admin/3d';
  if (path.startsWith('/admin/')) return '/admin';
  if (path === '/app/factor' || path === '/app/360' || path === '/app/3d') return '/app';
  if (path.startsWith('/app/360/')) return '/app/360';
  if (path.startsWith('/app/3d/')) return '/app/3d';
  if (path.startsWith('/app/')) return '/app';
  return null;
}

export function BrandHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const dashboardPath =
    !user ? '/login' : user.role === 'admin' ? '/admin' : '/app';

  const showActions = Boolean(user);
  const isAdmin = user?.role === 'admin';

  const backPath = getBackPath(location.pathname);

  async function handleLogout() {
    await signOut(auth);
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-14 w-full items-center justify-between gap-2 px-3 sm:px-4 md:px-6">
        <Link
          to={user ? dashboardPath : '/login'}
          className="flex min-w-0 items-center gap-2 sm:gap-3 transition-opacity duration-200 hover:opacity-80"
        >
          <img
            src="/logo.ico"
            alt=""
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="hidden truncate text-xs font-medium tracking-tight text-black sm:inline-block sm:text-sm md:text-base sm:max-w-[40vw]">
            {t('brand_name')}
          </span>
        </Link>

        {showActions && (
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSelector className="hidden sm:flex" />
            <button
              type="button"
              onClick={() => backPath && navigate(backPath)}
              disabled={!backPath}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-black hover:text-black disabled:opacity-40 disabled:pointer-events-none sm:h-9 sm:w-9"
              aria-label={t('header_aria_back')}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-black hover:text-black sm:h-9 sm:w-9"
              aria-label="Home"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l9-9 9 9M4.5 10.5V21h15V10.5"
                />
              </svg>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin/customers')}
                className="hidden h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-black hover:text-black sm:flex sm:h-9 sm:w-9"
              aria-label={t('header_aria_settings')}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.573-1.066z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-black hover:text-black sm:h-9 sm:w-9"
              aria-label={t('header_aria_logout')}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
