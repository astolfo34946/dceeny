/**
 * Invoice print: generates a full HTML document for the Factor (invoice)
 * and opens it in a new tab. User clicks Print to call window.print().
 * See INVOICE_PRINT.md in project root for full documentation.
 */

import { FACTOR_CURRENCY } from '../lib/factor';

export interface InvoicePrintData {
  id: string;
  clientId: string;
  createdAt: string;
}

export interface ClientPrintData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface PurchaseLinePrint {
  item_name: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
}

export interface PaymentLinePrint {
  amount: number;
}

export interface CompanyPrintInfo {
  name?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency?: string;
  footerText?: string;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function tryFetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    return dataUrl;
  } catch {
    return null;
  }
}

function formatCurrency(amount: number, currency: string = FACTOR_CURRENCY): string {
  return `${amount.toFixed(2)} ${currency}`;
}

function formatDateShort(isoOrTimestamp: string): string {
  try {
    const d = new Date(isoOrTimestamp);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoOrTimestamp || '—';
  }
}

/**
 * Generates a full HTML document (DOCTYPE, html, head, body) for the invoice.
 * All user-supplied strings are escaped to prevent XSS.
 */
export async function generateInvoiceHTML(
  invoice: InvoicePrintData,
  client: ClientPrintData,
  purchases: PurchaseLinePrint[],
  payments: PaymentLinePrint[],
  _balance: number | null,
  companyInfo: CompanyPrintInfo,
  logoUrl: string,
): Promise<string> {
  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_price, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  // Balance = Total Paid - Total Purchases (negative when owed, positive when credit).
  const balance = totalPaid - totalPurchases;
  const currency = companyInfo.currency ?? FACTOR_CURRENCY;
  const companyName = escapeHtml(companyInfo.name ?? companyInfo.companyName ?? '');
  const companyAddress = escapeHtml(companyInfo.address ?? '');
  const companyPhone = escapeHtml(companyInfo.phone ?? '');
  const companyEmail = escapeHtml(companyInfo.email ?? '');
  const companyWebsite = escapeHtml(companyInfo.website ?? '');
  const companyWebsiteHref = (companyInfo.website ?? '').trim().toLowerCase();
  const websiteIsLink = companyWebsiteHref.startsWith('http://') || companyWebsiteHref.startsWith('https://');
  const footerText = escapeHtml(companyInfo.footerText ?? 'Thank you for your business!');
  const clientName = escapeHtml(client.name ?? '');
  const clientPhone = escapeHtml(client.phone ?? '');
  const clientAddress = escapeHtml(client.address ?? '');
  const invoiceDateShort = formatDateShort(invoice.createdAt);
  const invoiceId = escapeHtml(invoice.id);

  const logoUrlTrimmed = (logoUrl ?? '').trim();
  const resolvedLogo =
    logoUrlTrimmed && !logoUrlTrimmed.startsWith('data:')
      ? (await tryFetchAsDataUrl(logoUrlTrimmed)) ?? logoUrlTrimmed
      : logoUrlTrimmed;

  const qtyLabel = (p: PurchaseLinePrint) =>
    p.unit && p.unit !== 'unit' ? `${p.quantity} ${p.unit}` : String(p.quantity);
  const rows = purchases
    .map(
      (p) => `
    <tr>
      <td>${escapeHtml(p.item_name)}</td>
      <td class="text-right">${escapeHtml(qtyLabel(p))}</td>
      <td class="text-right">${formatCurrency(p.unit_price, currency)}</td>
      <td class="text-right">${formatCurrency(p.total_price, currency)}</td>
    </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Invoice ${invoiceId}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; color: #111; background: #f5f5f5; -webkit-text-size-adjust: 100%; }
    .invoice-toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
    .invoice-toolbar button { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid #ccc; background: #fff; }
    .invoice-toolbar button.primary { background: #111; color: #fff; border-color: #111; }
    .invoice-page-wrap { max-width: 700px; margin: 0 auto; padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    #invoice { }
    .invoice-divider { border-top: 1px solid #e5e7eb; margin: 0; }
    .invoice-company { font-size: 18px; font-weight: 600; text-align: center; padding: 12px 0; }
    .invoice-header-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 0; }
    .invoice-logo-wrap { flex-shrink: 0; }
    .invoice-header-row img { max-width: 160px; max-height: 80px; width: auto; height: auto; object-fit: contain; display: block; }
    .invoice-date { text-align: right; font-size: 14px; color: #111; }
    .invoice-meta { margin-top: 12px; text-align: right; color: #666; font-size: 12px; }
    .bill-to { margin-bottom: 20px; }
    .bill-to h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin: 0 0 6px 0; }
    .bill-to p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; border-bottom: 1px solid #eee; }
    th.text-right { text-align: right; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    td.text-right { text-align: right; }
    .totals { margin-top: 24px; max-width: 280px; margin-left: auto; }
    .totals tr:last-child { font-weight: 600; font-size: 15px; }
    .totals td { border-bottom: none; padding: 6px 0; }
    .totals td:first-child { color: #666; }
    .invoice-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 13px; }
    @media print {
      body { background: #fff; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .invoice-toolbar { display: none !important; }
      body * { visibility: hidden; }
      .invoice-page-wrap, #invoice, #invoice * { visibility: visible; }
      .invoice-page-wrap { box-shadow: none; border-radius: 0; max-width: none; padding: 0; }
      #invoice { position: absolute; left: 0; top: 0; width: 100%; }
      .invoice-header-row img { max-width: 160px; max-height: 80px; }
    }
  </style>
</head>
<body>
  <div class="invoice-toolbar">
    <button type="button" class="primary" id="invoice-print-btn">Print</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>
  <script>
    (function() {
      var btn = document.getElementById('invoice-print-btn');
      if (btn) btn.addEventListener('click', function() {
        var ua = navigator.userAgent;
        var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIOS) setTimeout(function() { window.print(); }, 350);
        else window.print();
      });
    })();
  </script>
  <div class="invoice-page-wrap">
    <div id="invoice">
      <div class="invoice-divider"></div>
      ${companyName ? `<div class="invoice-company">${companyName}</div>` : ''}
      <div class="invoice-divider"></div>
      <div class="invoice-header-row">
        ${(resolvedLogo && resolvedLogo.trim()) ? `<div class="invoice-logo-wrap"><img src="${escapeHtml(resolvedLogo.trim())}" alt="" onerror="this.style.display=\'none\'" /></div>` : '<div class="invoice-logo-wrap"></div>'}
        <div class="invoice-date">Date: ${invoiceDateShort}</div>
      </div>
      <div class="invoice-divider"></div>
      <div class="invoice-meta">
        ${companyAddress ? `<div style="margin-top:4px">${companyAddress.replace(/\n/g, '<br/>')}</div>` : ''}
        ${companyPhone ? `<div>${companyPhone}</div>` : ''}
        ${companyEmail ? `<div>${companyEmail}</div>` : ''}
        ${companyWebsite ? `<div>${websiteIsLink ? `<a href="${escapeHtml(companyWebsiteHref)}" target="_blank" rel="noopener">${companyWebsite}</a>` : companyWebsite}</div>` : ''}
      </div>
      <div class="bill-to">
        <h3>Bill To</h3>
        <p><strong>${clientName}</strong></p>
        ${clientPhone ? `<p>${clientPhone}</p>` : ''}
        ${clientAddress ? `<p>${clientAddress.replace(/\n/g, '<br/>')}</p>` : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-right">Qty / Unit</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#888">No items</td></tr>'}</tbody>
      </table>
      <table class="totals">
        <tr><td>Total Purchases</td><td class="text-right">${formatCurrency(totalPurchases, currency)}</td></tr>
        <tr><td>Total Paid</td><td class="text-right">${formatCurrency(totalPaid, currency)}</td></tr>
        <tr><td>Balance</td><td class="text-right">${formatCurrency(balance, currency)}</td></tr>
      </table>
      <div class="invoice-footer">${footerText}</div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Opens the invoice HTML in a new tab. User can click Print or Close.
 * Revokes the blob URL after 60s to avoid leaking memory.
 */
export function openInvoiceInNewTab(html: string): void {
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
