import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface DashboardCardsProps {
  factorHref: string;
  dceeny360Href: string;
  is360Locked: boolean;
  is3DLocked?: boolean;
  isAdmin: boolean;
  /** Optional welcome name (e.g. user first name) */
  userName?: string;
  /** Optional 3D viewer link; when provided, show a third card for 3D. */
  threeDHref?: string;
}

function IconFactor() {
  return (
    <svg className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function Icon360() {
  return (
    <svg className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function Icon3D() {
  return (
    <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-9m8-4.5-8 4.5-8-4.5" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="h-8 w-8 shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

export function DashboardCards({
  factorHref,
  dceeny360Href,
  is360Locked,
  is3DLocked = false,
  isAdmin,
  userName,
  threeDHref,
}: DashboardCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <section className="mb-10 text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl">
          {userName
            ? t('dashboard_welcome_name', { name: userName })
            : t('dashboard_welcome')}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 md:text-base">
          {isAdmin
            ? t('dashboard_admin_subtitle')
            : t('dashboard_customer_subtitle')}
        </p>
      </section>

      <p className="mb-6 text-left text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
        {t('dashboard_choose_section')}
      </p>
      <div
        className={
          isAdmin
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid gap-4 grid-cols-1'
        }
      >
        <Link
          to={factorHref}
          className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-black group-hover:border-black">
            <IconFactor />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-base font-semibold tracking-tight text-black group-hover:opacity-90">
              {t('dashboard_factor_title')}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">
              {isAdmin
                ? t('dashboard_factor_subtitle_admin')
                : t('dashboard_factor_subtitle_customer')}
            </span>
          </div>
          <svg className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {is360Locked ? (
          <div
            className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-left opacity-90"
            aria-disabled="true"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white">
              <IconLock />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-base font-semibold tracking-tight text-neutral-600">
                {t('dashboard_360_title')}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {t('dashboard_360_locked_subtitle')}
              </span>
            </div>
          </div>
        ) : (
          <Link
            to={dceeny360Href}
            className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-black group-hover:border-black">
              <Icon360 />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-base font-semibold tracking-tight text-black group-hover:opacity-90">
                {t('dashboard_360_title')}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {isAdmin
                  ? t('dashboard_360_subtitle_admin')
                  : t('dashboard_360_subtitle_customer')}
              </span>
            </div>
            <svg className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {threeDHref && (is3DLocked ? (
          <div
            className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-left opacity-90"
            aria-disabled="true"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white">
              <IconLock />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-base font-semibold tracking-tight text-neutral-600">
                {t('dashboard_3d_title')}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {t('dashboard_3d_locked_subtitle')}
              </span>
            </div>
          </div>
        ) : (
          <Link
            to={threeDHref}
            className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 text-black group-hover:border-black">
              <Icon3D />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-base font-semibold tracking-tight text-black group-hover:opacity-90">
                {t('dashboard_3d_title')}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {isAdmin
                  ? t('dashboard_3d_subtitle_admin')
                  : t('dashboard_3d_subtitle_customer')}
              </span>
            </div>
            <svg className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
