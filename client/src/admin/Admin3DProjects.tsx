import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import type { Project } from '../types/app';

interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

export function Admin3DProjects() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<(Project & { id: string })[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    async function load() {
      const [projSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), orderBy('name', 'asc'))),
        getDocs(collection(db, 'users')),
      ]);
      setProjects(
        projSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          is360Unlocked: d.data().is360Unlocked === true,
          is3DUnlocked: d.data().is3DUnlocked === true,
        })) as (Project & { id: string })[],
      );
      const cust: CustomerOption[] = [];
      userSnap.forEach((d) => {
        const data = d.data() as { role?: string; name?: string; email?: string };
        if (data.role === 'customer') {
          cust.push({
            id: d.id,
            name: data.name ?? '',
            email: data.email ?? '',
          });
        }
      });
      setCustomers(cust);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'projects'), {
        name: newName.trim(),
        address: newAddress.trim() || null,
        customerId: null,
        is360Unlocked: false,
        is3DUnlocked: false,
        createdAt: new Date().toISOString(),
      });
      setProjects((prev) => [
        ...prev,
        {
          id: ref.id,
          name: newName.trim(),
          address: newAddress.trim() || undefined,
          customerId: null,
          is360Unlocked: false,
          is3DUnlocked: false,
        },
      ]);
      setNewName('');
      setNewAddress('');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignCustomer(projectId: string, customerId: string | null) {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId), { customerId });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, customerId } : p)),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle3D(projectId: string, value: boolean) {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId), { is3DUnlocked: value });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, is3DUnlocked: value } : p)),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(projectId: string) {
    if (!window.confirm(t('admin_projects_delete_confirm'))) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {t('admin_3d_projects_title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t('admin_3d_projects_subtitle')}
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
            {t('admin_projects_create_title_label')}
          </label>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black outline-none focus:border-black"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
            {t('admin_projects_create_address_label')}
          </label>
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black outline-none focus:border-black"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t('admin_projects_create_button')}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
          <div>{t('admin_projects_table_name')}</div>
          <div>{t('admin_projects_table_address')}</div>
          <div>{t('admin_projects_table_customer')}</div>
          <div>{t('admin_3d_unlock_label')}</div>
          <div />
          <div />
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            {t('admin_projects_empty')}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {projects.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="font-medium text-black">{p.name}</div>
                <div className="text-neutral-600">{p.address || '—'}</div>
                <div>
                  <select
                    value={p.customerId ?? ''}
                    onChange={(e) => handleAssignCustomer(p.id, e.target.value || null)}
                    disabled={saving}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">{t('admin_projects_not_assigned')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{t('admin_3d_unlock_label')}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.is3DUnlocked}
                    onClick={() => handleToggle3D(p.id, !p.is3DUnlocked)}
                    disabled={saving || !p.customerId}
                    className={`relative h-6 w-11 shrink-0 rounded-full border border-neutral-300 transition-colors ${
                      p.is3DUnlocked ? 'bg-black' : 'bg-neutral-200'
                    } ${!p.customerId ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        p.is3DUnlocked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <Link
                  to={`/admin/3d/${p.id}/scenes`}
                  className="text-xs font-medium uppercase tracking-wider text-black hover:underline"
                >
                  {t('admin_3d_scenes_link')}
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={saving}
                  className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
                >
                  {t('admin_projects_delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

