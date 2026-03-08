import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import type { Purchase, Payment } from '../types/app';
import { getOrCreateFactorForCustomer, recomputeFactorTotals, formatFactorAmount } from '../lib/factor';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function AdminFactor() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const factorId = customerId ?? '';

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totals, setTotals] = useState({ totalPurchases: 0, totalPaid: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    if (!factorId) return;
    const factor = await getOrCreateFactorForCustomer(factorId);
    setTotals({
      totalPurchases: factor.totalPurchases,
      totalPaid: factor.totalPaid,
      balance: factor.balance,
    });

    const [purchasesSnap, paymentsSnap] = await Promise.all([
      getDocs(query(collection(db, 'factors', factorId, 'purchases'), orderBy('date', 'desc'))),
      getDocs(query(collection(db, 'factors', factorId, 'payments'), orderBy('date', 'desc'))),
    ]);

    const purchaseList: Purchase[] = purchasesSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        description: (data.description as string) ?? '',
        amount: typeof data.amount === 'number' ? data.amount : 0,
        date: (data.date as string) ?? '',
      };
    });
    const paymentList: Payment[] = paymentsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        amount: typeof data.amount === 'number' ? data.amount : 0,
        date: (data.date as string) ?? '',
        method: data.method as string | undefined,
        note: data.note as string | undefined,
      };
    });

    setPurchases(purchaseList);
    setPayments(paymentList);
    setLoading(false);
  }, [factorId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // --- Purchase modal ---
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    description: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
  });

  const openAddPurchase = () => {
    setEditingPurchaseId(null);
    setPurchaseForm({
      description: '',
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    setPurchaseModalOpen(true);
  };

  const openEditPurchase = (p: Purchase) => {
    setEditingPurchaseId(p.id);
    setPurchaseForm({
      description: p.description,
      amount: p.amount,
      date: p.date ? p.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    setPurchaseModalOpen(true);
  };

  const savePurchase = async () => {
    if (!factorId) return;
    setSaving(true);
    try {
      const payload = {
        description: purchaseForm.description.trim(),
        amount: round2(Number(purchaseForm.amount) || 0),
        date: new Date(purchaseForm.date).toISOString(),
      };
      if (editingPurchaseId) {
        await updateDoc(doc(db, 'factors', factorId, 'purchases', editingPurchaseId), payload);
      } else {
        await addDoc(collection(db, 'factors', factorId, 'purchases'), payload);
      }
      await recomputeFactorTotals(factorId);
      await loadData();
      setPurchaseModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const deletePurchase = async (id: string) => {
    if (!factorId || !window.confirm(t('factor_delete_purchase_confirm'))) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'factors', factorId, 'purchases', id));
      await recomputeFactorTotals(factorId);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  // --- Payment modal ---
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
  });

  const openAddPayment = () => {
    setEditingPaymentId(null);
    setPaymentForm({
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    setPaymentModalOpen(true);
  };

  const openEditPayment = (p: Payment) => {
    setEditingPaymentId(p.id);
    setPaymentForm({
      amount: p.amount,
      date: p.date ? p.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    setPaymentModalOpen(true);
  };

  const savePayment = async () => {
    if (!factorId) return;
    setSaving(true);
    try {
      const payload = {
        amount: round2(Number(paymentForm.amount) || 0),
        date: new Date(paymentForm.date).toISOString(),
      };
      if (editingPaymentId) {
        await updateDoc(doc(db, 'factors', factorId, 'payments', editingPaymentId), payload);
      } else {
        await addDoc(collection(db, 'factors', factorId, 'payments'), payload);
      }
      await recomputeFactorTotals(factorId);
      await loadData();
      setPaymentModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (id: string) => {
    if (!factorId || !window.confirm(t('factor_delete_payment_confirm'))) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'factors', factorId, 'payments', id));
      await recomputeFactorTotals(factorId);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  function IconBack() {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    );
  }
  function IconEdit() {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    );
  }
  function IconTrash() {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/customers')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-black hover:text-black"
            aria-label="Back to customers"
          >
            <IconBack />
          </button>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-black">
            {t('factor_admin_title')}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t('factor_admin_subtitle')}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {t('factor_total_purchases')}
          </p>
          <p className="mt-1 text-xl font-semibold text-black">{formatFactorAmount(totals.totalPurchases)}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
            {t('factor_total_paid')}
          </p>
          <p className="mt-1 text-xl font-semibold text-black">{formatFactorAmount(totals.totalPaid)}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
            {t('factor_balance')}
          </p>
          <p className="mt-1 text-xl font-semibold text-black">{formatFactorAmount(totals.balance)}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      ) : (
        <>
          {/* TABLE 1: PURCHASES */}
          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
                {t('factor_purchases')}
              </h2>
              <button
                type="button"
                onClick={openAddPurchase}
                className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t('factor_admin_add_purchase')}
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    <th className="px-4 py-3">{t('factor_table_date')}</th>
                    <th className="px-4 py-3">{t('factor_table_description')}</th>
                    <th className="px-4 py-3 text-right">{t('factor_table_amount')}</th>
                    <th className="w-24 px-4 py-3 text-right">{t('common_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                        {t('factor_empty_purchases')}
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p) => (
                      <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                        <td className="px-4 py-3 text-neutral-700">
                          {p.date ? new Date(p.date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-black">{p.description || '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditPurchase(p)}
                              className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-black"
                              aria-label={t('common_edit')}
                            >
                              <IconEdit />
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePurchase(p.id)}
                              disabled={saving}
                              className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              aria-label={t('common_delete')}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* TABLE 2: PAYMENTS */}
          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
                {t('factor_payments')}
              </h2>
              <button
                type="button"
                onClick={openAddPayment}
                className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t('factor_admin_add_payment')}
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    <th className="px-4 py-3">{t('factor_table_date')}</th>
                    <th className="px-4 py-3 text-right">{t('factor_table_amount')}</th>
                    <th className="w-24 px-4 py-3 text-right">{t('common_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">
                        {t('factor_empty_payments')}
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                        <td className="px-4 py-3 text-neutral-700">
                          {p.date ? new Date(p.date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-black">{formatFactorAmount(p.amount)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditPayment(p)}
                              className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-black"
                              aria-label={t('common_edit')}
                            >
                              <IconEdit />
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePayment(p.id)}
                              disabled={saving}
                              className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              aria-label={t('common_delete')}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Purchase modal */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-black">
              {editingPurchaseId
                ? t('factor_admin_modal_edit_purchase')
                : t('factor_admin_modal_add_purchase')}
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {t('factor_table_date')}
                </label>
                <input
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {t('factor_table_description')}
                </label>
                <input
                  type="text"
                  value={purchaseForm.description}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
                  placeholder={t('common_description_placeholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {t('factor_table_amount')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseForm.amount || ''}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={savePurchase}
                disabled={saving}
                className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? t('common_saving') : t('common_save')}
              </button>
              <button
                type="button"
                onClick={() => setPurchaseModalOpen(false)}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {t('common_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-black">
              {editingPaymentId
                ? t('factor_admin_modal_edit_payment')
                : t('factor_admin_modal_add_payment')}
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {t('factor_table_date')}
                </label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {t('factor_table_amount')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={savePayment}
                disabled={saving}
                className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? t('common_saving') : t('common_save')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {t('common_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
