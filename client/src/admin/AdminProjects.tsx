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

export function AdminProjects() {
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
          is360Unlocked: (d.data().is360Unlocked === true),
          is3DUnlocked: (d.data().is3DUnlocked === true),
        })) as (Project & { id: string })[]
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
        prev.map((p) => (p.id === projectId ? { ...p, customerId } : p))
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle360(projectId: string, value: boolean) {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId), { is360Unlocked: value });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, is360Unlocked: value } : p
        )
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

  async function handleUpdateProject(projectId: string, updates: { name?: string; address?: string }) {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId), updates);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {t('admin_projects_title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t('admin_projects_subtitle')}
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
        {/* Desktop: table header */}
        <div className="hidden border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500 md:grid md:grid-cols-[1fr_1fr_1fr_auto_auto_auto] md:gap-3">
          <div>{t('admin_projects_table_name')}</div>
          <div>{t('admin_projects_table_address')}</div>
          <div>{t('admin_projects_table_customer')}</div>
          <div>{t('admin_projects_table_unlock_360')}</div>
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
                className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_1fr_1fr_auto_auto_auto] md:items-center md:py-3"
              >
                <div className="md:min-w-0">
                  <span className="text-xs font-medium uppercase text-neutral-500 md:hidden">{t('admin_projects_table_name')}</span>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) =>
                      setProjects((prev) =>
                        prev.map((proj) => (proj.id === p.id ? { ...proj, name: e.target.value } : proj))
                      )
                    }
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (p.name || '')) handleUpdateProject(p.id, { name: v });
                    }}
                    disabled={saving}
                    className="mt-0.5 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm font-medium text-black outline-none focus:border-black md:mt-0"
                  />
                </div>
                <div className="md:min-w-0">
                  <span className="text-xs font-medium uppercase text-neutral-500 md:hidden">{t('admin_projects_table_address')}</span>
                  <input
                    type="text"
                    value={p.address || ''}
                    onChange={(e) =>
                      setProjects((prev) =>
                        prev.map((proj) => (proj.id === p.id ? { ...proj, address: e.target.value } : proj))
                      )
                    }
                    onBlur={(e) => {
                      const v = e.target.value.trim() || undefined;
                      if (v !== (p.address || '')) handleUpdateProject(p.id, { address: v || undefined });
                    }}
                    disabled={saving}
                    placeholder="—"
                    className="mt-0.5 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-600 outline-none focus:border-black md:mt-0"
                  />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-neutral-500 md:hidden">{t('admin_projects_table_customer')}</span>
                  <select
                    value={p.customerId ?? ''}
                    onChange={(e) =>
                      handleAssignCustomer(p.id, e.target.value || null)
                    }
                    disabled={saving}
                    className="mt-0.5 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-black md:mt-0"
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
                  <span className="text-xs text-neutral-500">{t('admin_projects_table_unlock_360')}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.is360Unlocked}
                    onClick={() => handleToggle360(p.id, !p.is360Unlocked)}
                    disabled={saving || !p.customerId}
                    className={`relative h-6 w-11 shrink-0 rounded-full border border-neutral-300 transition-colors ${
                      p.is360Unlocked ? 'bg-black' : 'bg-neutral-200'
                    } ${!p.customerId ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        p.is360Unlocked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 md:border-t-0 md:pt-0">
                  <Link
                    to={`/admin/projects/${p.id}/weeks`}
                    className="text-xs font-medium uppercase tracking-wider text-black hover:underline"
                  >
                    {t('admin_projects_weeks_link')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    disabled={saving}
                    className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {t('admin_projects_delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
