# Print Feature – Full Documentation

This document describes how the **invoice print** feature works in this project and how to reuse it on another site.

---

## 1. Overview

The print flow has two parts:

1. **Generate HTML** – Build a full HTML page (invoice content + toolbar + print styles).
2. **Open & print** – Open that HTML in a new tab; the user clicks "Print" to call `window.print()`.

No Electron or special APIs are used; everything is standard browser (HTML + `window.print()`).

---

## 2. Core Files

| File | Role |
|------|------|
| `src/utils/invoiceHTML.js` | Generates invoice HTML and opens it in a new tab. |

Everything you need to copy or reimplement lives in that file (and the data you pass in).

---

## 3. How It Works (Step by Step)

### Step 1: Build the data

You need:

- **invoice** – `{ id, client_id, created_at }` (and any extra fields you want to show).
- **client** – `{ name, phone?, email?, address? }`.
- **purchases** – Array of `{ item_name, quantity, unit_price, total_price }`.
- **payments** – Array of `{ amount }` (used to compute "Paid").
- **balance** – Optional; used for consistency (not required for the HTML math).
- **companyInfo** – `{ name?, companyName?, address?, currency? }` (default currency `'USD'`).
- **logoUrl** – Optional image URL for the company logo.

The HTML generator computes:

- **Total purchases** = sum of `purchases[].total_price`
- **Total payments** = sum of `payments[].amount`
- **Amount due** = `max(0, totalPurchases - totalPayments)`

### Step 2: Generate HTML

Call:

```js
const html = await generateInvoiceHTML(
  invoice,
  client,
  purchases,
  payments,
  balance,
  companyInfo,
  logoUrl || ''
);
```

`generateInvoiceHTML` is **async** (for consistency with possible future async work; currently it's synchronous inside). It returns one string: a **full HTML document** (DOCTYPE, `<html>`, `<head>`, `<body>`).

That HTML includes:

- **Toolbar** – "Print" (calls `window.print()`) and "Close" (calls `window.close()`).
- **Invoice content** – Company name, logo, date, "Bill To", items table, subtotal/paid/due, footer.
- **Styles** – Layout and **print-only rules** so that when the user prints:
  - The toolbar is hidden.
  - Only the invoice area is visible (rest of body hidden).
  - Page is clean (no shadows, white background, etc.).

### Step 3: Open in new tab

Call:

```js
openInvoiceInNewTab(html);
```

This:

1. Creates a `Blob` from the HTML string (`text/html; charset=utf-8`).
2. Creates an object URL with `URL.createObjectURL(blob)`.
3. Opens that URL in a new tab (`window.open(url, '_blank', 'noopener,noreferrer')`).
4. Revokes the object URL after 60 seconds to avoid leaking memory.

In that new tab the user sees the invoice and can:

- Click **Print** → browser print dialog (`window.print()`).
- Click **Close** → close the tab (`window.close()`).

---

## 4. What's Inside the Generated HTML (Summary)

- **`<head>`**  
  - Meta charset and viewport.  
  - `<title>` like `Invoice &lt;id&gt;`.  
  - One `<style>` block with:
    - Reset and layout (toolbar, invoice card, tables).
    - Responsive rules for small screens.
    - **`@media print`** rules that:
      - Hide `.invoice-toolbar`.
      - Set `body * { visibility: hidden; }` and then show only `.invoice-page-wrap`, `#invoice`, and `#invoice *`.
      - Position `#invoice` at top-left, full width, no shadow, no border-radius.

- **`<body>`**  
  - `.invoice-toolbar` with:
    - `<button class="primary" onclick="window.print()">Print</button>`
    - `<button onclick="window.close()">Close</button>`
  - `.invoice-page-wrap` > `#invoice` containing:
    - Company name
    - Header (logo + date + company address)
    - "Bill To" (client name, phone, email, address)
    - Items table (Item, Quantity, Unit Price, Total)
    - Totals table (Subtotal, Paid, Amount Due)
    - Footer ("Thank you for your business!")

All user-supplied text is escaped with `escapeHtml()` to avoid XSS (only the structure above is fixed).

---

## 5. How to Add This to Another Site

### Option A: Copy the utility file

1. Copy `src/utils/invoiceHTML.js` into your other project.
2. Ensure the other project can call:
   - `generateInvoiceHTML(invoice, client, purchases, payments, balance, companyInfo, logoUrl)`
   - `openInvoiceInNewTab(html)`
3. Where you want "Print invoice":
   - Build the same data (invoice, client, purchases, payments, balance, companyInfo, logoUrl).
   - Call `const html = await generateInvoiceHTML(...)`.
   - Call `openInvoiceInNewTab(html)`.

No React or Firebase is required; the module only needs:

- `escapeHtml` and `formatCurrency` (both are defined inside `invoiceHTML.js` in this project).

So you can use it in a plain JS/TS app, or from any framework.

### Option B: Reimplement from this spec

If you prefer not to copy the file:

1. **Data**  
   Use the same inputs and the same formulas (total purchases, total payments, amount due) as in Section 3.

2. **HTML string**  
   Build a single string that is a full document:
   - DOCTYPE + `<html lang="en">`.
   - `<head>` with meta, title, and one `<style>` that includes:
     - Normal layout (toolbar + invoice).
     - **`@media print`** that hides the toolbar and shows only the invoice (e.g. visibility trick or a print-only wrapper).
   - `<body>` with toolbar (Print → `window.print()`, Close → `window.close()`) and the invoice markup (company, client, items table, totals, footer).

3. **Opening**  
   Same as `openInvoiceInNewTab`:  
   `Blob` → `URL.createObjectURL` → `window.open(url, '_blank', 'noopener,noreferrer')` → optional `URL.revokeObjectURL` after a delay.

4. **Security**  
   Escape every user-controlled string (company name, client name, address, item names, etc.) when inserting into HTML to prevent XSS.

---

## 6. Usage in This Project

### Invoices page (`src/pages/Invoices.jsx`)

- **Preview:**  
  `openPreview(inv)` loads client, purchases, payments, balance, then calls `generateInvoiceHTML(...)` and stores the result in state. The modal shows that HTML in a wrapper (e.g. iframe or `dangerouslySetInnerHTML` in a div).
- **Print (no preview):**  
  On "Print" button: same data load, then `generateInvoiceHTML(...)` → `openInvoiceInNewTab(html)`.
- **From preview:**  
  "Open in new tab" calls `openInvoiceInNewTab(previewHtml)`.

### Client detail (`src/pages/ClientDetail.jsx`)

- **"Print Invoice" (create + preview):**  
  `handlePrintInvoice()` creates an invoice from current purchases, then loads the new invoice + client + purchases for that invoice + payments + balance, calls `generateInvoiceHTML(...)`, and sets `invoicePreview` so the preview modal opens.
- **"Open in new tab" from modal:**  
  `openPrintPage()` calls `openInvoiceInNewTab(invoicePreview)`.
- **Existing invoice row "Print":**  
  Loads invoice, client, purchases for that invoice, payments, balance; then `generateInvoiceHTML(...)` → `openInvoiceInNewTab(html)`.

So in all cases the flow is: **data → generateInvoiceHTML → (optional preview) → openInvoiceInNewTab**.

---

## 7. Important Details for Integration

- **Currency**  
  Passed via `companyInfo.currency` (e.g. `'USD'`, `'EUR'`). Used in `formatCurrency` inside the generated HTML.

- **Dates**  
  Invoice date is taken from `invoice.created_at`. If it's a Firestore Timestamp, the code uses `.toDate()`; otherwise `new Date(invoice.created_at)`. Format is locale `'en-US'`, long form (e.g. "March 9, 2025").

- **Logo**  
  If you pass a `logoUrl`, it's used in an `<img>` inside the header. For cross-origin or large images, consider CORS and size; the template uses `max-width: 140px; max-height: 70px`.

- **Print CSS**  
  The "only show invoice" effect is done with:
  - `body * { visibility: hidden; }`
  - `.invoice-page-wrap, #invoice, #invoice * { visibility: visible; }`
  - `#invoice { position: absolute; left: 0; top: 0; width: 100%; ... }`  
  So the toolbar and any other UI are not shown in the print output.

- **Blob URL lifetime**  
  `openInvoiceInNewTab` revokes the object URL after 60 seconds. If the user keeps the tab open longer, the document is already loaded so printing still works. Revoking only frees the blob reference.

---

## 8. Minimal Example (Copy-Paste for Another Site)

```js
// You need: generateInvoiceHTML and openInvoiceInNewTab from invoiceHTML.js
// (or equivalent implementations as in Section 5)

const invoice = { id: 'INV-001', client_id: 'c1', created_at: new Date() };
const client = { name: 'Acme Corp', phone: '+1 234 567 8900', email: 'acme@example.com', address: '123 Main St' };
const purchases = [
  { item_name: 'Design consultation', quantity: 1, unit_price: 500, total_price: 500 },
  { item_name: '3D render', quantity: 2, unit_price: 200, total_price: 400 },
];
const payments = [{ amount: 400 }];
const balance = null;
const companyInfo = { name: 'My Studio', address: '456 Oak Ave', currency: 'USD' };
const logoUrl = '';

const html = await generateInvoiceHTML(invoice, client, purchases, payments, balance, companyInfo, logoUrl);
openInvoiceInNewTab(html);
```

After this runs, a new tab opens with the invoice; the user clicks "Print" to open the browser print dialog.

---

## 9. Summary

| What | How |
|------|-----|
| **Generate printable invoice** | `generateInvoiceHTML(invoice, client, purchases, payments, balance, companyInfo, logoUrl)` → full HTML string. |
| **Show it for printing** | `openInvoiceInNewTab(html)` → new tab with Print/Close buttons; Print calls `window.print()`. |
| **Add to another site** | Copy `invoiceHTML.js` (or reimplement from this doc), then call the two functions with your own data. |
| **Print behavior** | Handled by `@media print` in the generated HTML (toolbar hidden, only invoice visible). |

No server-side rendering or PDF library is required; the entire flow is client-side HTML + browser print.
