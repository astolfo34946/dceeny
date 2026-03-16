import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { Purchase, Payment, Factor } from '../types/app';
import { getOrCreateFactorForCustomer, recomputeFactorTotals, formatFactorAmount } from '../lib/factor';
import { generateInvoiceHTML, openInvoiceInNewTab } from '../utils/invoiceHTML';
import { getInvoiceSettings } from '../lib/invoiceSettings';

export function CustomerFactor() {
  const { user } = useAuth();
  const factorId = user?.id ?? '';

  const [factor, setFactor] = useState<Factor | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [printLoading, setPrintLoading] = useState(false);
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    if (!factorId) return;
    // Ensure totals / balance are always in sync with purchases + payments
    await recomputeFactorTotals(factorId);
    const factorData = await getOrCreateFactorForCustomer(factorId);
    setFactor(factorData);

    const [purchasesSnap, paymentsSnap] = await Promise.all([
      getDocs(query(collection(db, 'factors', factorId, 'purchases'), orderBy('date', 'desc'))),
      getDocs(query(collection(db, 'factors', factorId, 'payments'), orderBy('date', 'desc'))),
    ]);

    const purchaseList: Purchase[] = purchasesSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const q = typeof data.quantity === 'number' && data.quantity >= 0 ? data.quantity : 1;
      const up = typeof data.unitPrice === 'number' ? data.unitPrice : 0;
      const amt = typeof data.amount === 'number' ? data.amount : q * up;
      return {
        id: d.id,
        description: (data.description as string) ?? '',
        quantity: q,
        unit: (data.unit as Purchase['unit']) ?? 'unit',
        unitPrice: up,
        amount: amt,
        date: (data.date as string) ?? '',
      };
    });
    const paymentList: Payment[] = paymentsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        amount: typeof data.amount === 'number' ? data.amount : 0,
        date: (data.date as string) ?? '',
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

  const handlePrintInvoice = async () => {
    if (!factor || !user) return;
    setPrintLoading(true);
    try {
      const settings = await getInvoiceSettings();
      const companyInfo = {
        name: settings.companyName,
        address: settings.companyAddress,
        phone: settings.companyPhone,
        email: settings.companyEmail,
        website: settings.companyWebsite,
        currency: settings.currency,
        footerText: settings.footerText,
      };
      const invoice = {
        id: factor.id,
        clientId: factor.customerId,
        createdAt: factor.createdAt ?? new Date().toISOString(),
      };
      const client = {
        name: user.name || 'Customer',
        email: user.email ?? '',
      };
      const purchaseLines = purchases.map((p) => {
        const qty = p.quantity ?? 1;
        const unitPrice = p.unitPrice ?? (qty > 0 ? p.amount / qty : 0);
        const total = Math.round(qty * unitPrice * 100) / 100;
        return {
          item_name: p.description || '—',
          quantity: qty,
          unit: p.unit ?? 'unit',
          unit_price: Math.round(unitPrice * 100) / 100,
          total_price: total,
        };
      });
      const paymentLines = payments.map((p) => ({ amount: p.amount }));
      const printLogoUrl = new URL(settings.logoUrl || '/logo.ico', window.location.href).toString();
      const html = await generateInvoiceHTML(
        invoice,
        client,
        purchaseLines,
        paymentLines,
        factor.balance,
        companyInfo,
        printLogoUrl,
      );
      openInvoiceInNewTab(html);
    } finally {
      setPrintLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl border-t border-neutral-200 px-4 pt-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">
            {t('customer_factor_title')}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t('customer_factor_subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrintInvoice}
          disabled={printLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:border-black hover:bg-neutral-50 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {printLoading ? t('common_saving') : t('factor_print_invoice')}
        </button>
      </div>

      <div className="border-b border-neutral-200" aria-hidden />

      {/* SUMMARY */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {t('factor_total_purchases')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-black">
            {formatFactorAmount(factor?.totalPurchases ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {t('factor_total_paid')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-black">
            {formatFactorAmount(factor?.totalPaid ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {t('factor_balance')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-black">
            {formatFactorAmount(factor?.balance ?? 0)}
          </p>
        </div>
      </div>

      {/* PURCHASES TABLE (read-only) */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
          {t('factor_purchases')}
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">{t('factor_table_date')}</th>
                <th className="px-4 py-3">{t('factor_table_item')}</th>
                <th className="px-4 py-3 text-right">{t('factor_table_quantity')}</th>
                <th className="px-4 py-3 text-right">{t('factor_table_amount')}</th>
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
                purchases.map((p) => {
                  const q = p.quantity ?? 1;
                  const u = p.unit ?? 'unit';
                  const qtyLabel = u === 'unit' ? String(q) : `${q} ${u}`;
                  return (
                  <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3 text-neutral-700">
                      {p.date ? new Date(p.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-black">{p.description || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{qtyLabel}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatFactorAmount(p.amount)}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAYMENTS TABLE (read-only) */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
          {t('factor_payments')}
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">{t('factor_table_date')}</th>
                <th className="px-4 py-3 text-right">{t('factor_table_amount')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-neutral-500">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
