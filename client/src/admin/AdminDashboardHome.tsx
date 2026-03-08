import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { db } from '../lib/firebase';

export function AdminDashboardHome() {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] || undefined;
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    (async () => {
      const [usersSnap, projectsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'projects')),
      ]);
      let customers = 0;
      usersSnap.forEach((d) => {
        if ((d.data() as any).role === 'customer') customers++;
      });
      setCustomerCount(customers);
      setProjectCount(projectsSnap.size);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          {firstName ? t('admin_dashboard_welcome', { name: firstName }) : t('admin_dashboard_title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t('admin_dashboard_subtitle')}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/admin/customers"
          className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-black">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {t('admin_dashboard_customers_factor_label')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-black">
              {customerCount ?? '—'}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {t('admin_dashboard_customers_factor_helper')}
            </p>
          </div>
          <svg className="h-5 w-5 shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          to="/admin/projects"
          className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-black">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {t('admin_dashboard_projects_label')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-black">
              {projectCount ?? '—'}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {t('admin_dashboard_projects_helper')}
            </p>
          </div>
          <svg className="h-5 w-5 shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
