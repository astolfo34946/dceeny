import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { useCustomerProject } from '../lib/useCustomerProject';
import { useAuth } from '../auth/AuthContext';
import type { Week } from '../types/app';

export function Customer360Weeks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { project, loading: projectLoading } = useCustomerProject(user?.id);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(true);

  useEffect(() => {
    if (!project?.id) {
      setWeeks([]);
      setLoadingWeeks(false);
      return;
    }
    const q = query(
      collection(db, 'projects', project.id, 'weeks'),
      orderBy('createdAt', 'desc')
    );
    getDocs(q).then((snap) => {
      setWeeks(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: (d.data().createdAt as string) || '',
        })) as Week[]
      );
      setLoadingWeeks(false);
    });
  }, [project?.id]);

  if (projectLoading || !project) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  if (loadingWeeks) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="h-4 w-64 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  const projectAddress = project.address?.trim();
  const totalRooms = weeks.reduce(
    (sum, w) =>
      sum + (w.scenes ?? []).filter((s) => Boolean(s?.imageUrl)).length,
    0
  );
  const latestWeek = weeks[0];
  const latestWeekId = latestWeek?.id;
  const lastUpdateLabel =
    latestWeek && latestWeek.createdAt
      ? new Date(latestWeek.createdAt).toLocaleDateString(undefined, {
          dateStyle: 'medium',
        })
      : '—';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-r from-neutral-900 via-black to-neutral-900 p-[1px] shadow-lg">
        <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-black via-neutral-900 to-neutral-900 px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
              {t('dashboard_360_title')}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {t('customer_360_weeks_title')}
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/70">
              {t('customer_360_weeks_subtitle')}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:w-80">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-subtle backdrop-blur">
              <p className="truncate text-sm font-medium">
                {project.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/60">
                {projectAddress || '—'}
              </p>
            </div>
            {weeks.length > 0 && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
                    {t('customer_360_overview_weeks')}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {weeks.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
                    {t('customer_360_overview_rooms')}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {totalRooms}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
                    {t('customer_360_overview_last_update')}
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums">
                    {lastUpdateLabel}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center">
          <img src="/logo.ico" alt="" className="mb-4 h-12 w-12 opacity-60" />
          <p className="text-sm text-neutral-600">{t('customer_360_weeks_empty')}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {weeks.map((week) => (
            <Link
              key={week.id}
              to={`/app/360/weeks/${week.id}`}
              className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                    {t('customer_360_week_label', { number: week.weekNumber })}
                  </span>
                  <h2 className="mt-2 truncate font-semibold tracking-tight text-black group-hover:opacity-90">
                    {week.title}
                  </h2>
                  {latestWeekId === week.id && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-white">
                      {t('customer_360_week_latest_badge')}
                    </span>
                  )}
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 group-hover:border-black group-hover:text-black">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                <span className="tabular-nums">
                  {week.createdAt ? new Date(week.createdAt).toLocaleDateString() : '—'}
                </span>
                <span className="tabular-nums">
                  {t('customer_360_rooms_count', {
                    count: (week.scenes ?? []).filter((s) => Boolean(s?.imageUrl)).length,
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
