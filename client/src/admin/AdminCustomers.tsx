import { useEffect, useState } from 'react';
import { collection, doc, getDocs, orderBy, query, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { PROJECTS_3D_COLLECTION } from '../lib/useCustomerProject';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(customerId: string) {
    const msg = t('admin_customers_delete_confirm', 'Delete this client? Their project links will be cleared.');
    if (!window.confirm(msg)) return;
    setDeletingId(customerId);
    try {
      const batch = writeBatch(db);
      const q360 = query(collection(db, 'projects'), where('customerId', '==', customerId));
      const q3d = query(collection(db, PROJECTS_3D_COLLECTION), where('customerId', '==', customerId));
      const [snap360, snap3d] = await Promise.all([getDocs(q360), getDocs(q3d)]);
      snap360.docs.forEach((d) => batch.update(d.ref, { customerId: null }));
      snap3d.docs.forEach((d) => batch.update(d.ref, { customerId: null }));
      await batch.commit();
      await deleteDoc(doc(db, 'users', customerId));
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    } catch (e) {
      console.error(e);
      window.alert(t('admin_customers_delete_error', 'Could not delete client.'));
    } finally {
      setDeletingId(null);
    }
  }

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
                <div className="flex items-center justify-end gap-2">
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
                  <button
                    type="button"
                    onClick={() => handleDelete(customer.id)}
                    disabled={deletingId === customer.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                    aria-label={t('admin_customers_delete_aria', 'Delete client')}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

