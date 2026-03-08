import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function AdminCustomers() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const usersQ = query(usersRef, orderBy('email', 'asc'));
      const usersSnap = await getDocs(usersQ);
      const users: UserRow[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data.role === 'customer') {
          users.push({
            id: docSnap.id,
            name: data.name ?? '',
            email: data.email ?? '',
            role: data.role ?? 'customer',
          });
        }
      });
      setCustomers(users);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {t('admin_customers_title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t('admin_customers_subtitle')}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto] border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          <div>{t('admin_customers_table_name')}</div>
          <div>{t('admin_customers_table_email')}</div>
          <div className="text-right">{t('dashboard_factor_title')}</div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 animate-pulse rounded-lg bg-neutral-100"
              />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-4 text-xs text-neutral-500">
            {t('admin_customers_empty')}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto] items-center gap-3 px-4 py-3 text-xs text-neutral-800"
              >
                <div className="truncate font-medium">
                  {customer.name || '—'}
                </div>
                <div className="truncate text-neutral-600">
                  {customer.email}
                </div>
                <div className="flex justify-end">
                  <Link
                    to={`/admin/customers/${customer.id}/factor`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-black hover:text-black"
                    aria-label={t('admin_customers_open_factor_aria')}
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

