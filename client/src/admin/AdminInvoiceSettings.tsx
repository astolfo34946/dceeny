import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getInvoiceSettings,
  setInvoiceSettings,
  getDefaultInvoiceSettings,
  type InvoiceSettings,
} from '../lib/invoiceSettings';

const CURRENCY_OPTIONS = [
  { code: 'DZD', labelKey: 'invoice_settings_currency_dzd' },
  { code: 'DA', labelKey: 'invoice_settings_currency_da' },
  { code: 'USD', labelKey: 'invoice_settings_currency_usd' },
  { code: 'EUR', labelKey: 'invoice_settings_currency_eur' },
];

export function AdminInvoiceSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InvoiceSettings>(getDefaultInvoiceSettings());

  useEffect(() => {
    getInvoiceSettings()
      .then((s) => setForm(s))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await setInvoiceSettings(form);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {t('invoice_settings_title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t('invoice_settings_subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-8">
        {/* Company Information */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
            {t('invoice_settings_company_info')}
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                {t('invoice_settings_company_name')}
              </label>
              <input
                id="companyName"
                type="text"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="Dceeny Interior Design Studio"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label htmlFor="companyAddress" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                {t('invoice_settings_address')}
              </label>
              <textarea
                id="companyAddress"
                rows={2}
                value={form.companyAddress}
                onChange={(e) => setForm((f) => ({ ...f, companyAddress: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label htmlFor="companyPhone" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                {t('invoice_settings_phone')}
              </label>
              <input
                id="companyPhone"
                type="tel"
                value={form.companyPhone}
                onChange={(e) => setForm((f) => ({ ...f, companyPhone: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label htmlFor="companyEmail" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                {t('invoice_settings_email')}
              </label>
              <input
                id="companyEmail"
                type="email"
                value={form.companyEmail}
                onChange={(e) => setForm((f) => ({ ...f, companyEmail: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label htmlFor="companyWebsite" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                {t('invoice_settings_website')}
              </label>
              <input
                id="companyWebsite"
                type="url"
                value={form.companyWebsite}
                onChange={(e) => setForm((f) => ({ ...f, companyWebsite: e.target.value }))}
                placeholder="https://example.com"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                {t('invoice_settings_currency')}
              </label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="footerText" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
                {t('invoice_settings_footer')}
              </label>
              <input
                id="footerText"
                type="text"
                value={form.footerText}
                onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
        </section>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-black bg-black px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t('common_saving') : t('invoice_settings_save_company_info')}
          </button>
        </div>
      </form>
    </div>
  );
}
