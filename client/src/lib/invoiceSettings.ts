import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { FACTOR_CURRENCY } from './factor';

const SETTINGS_COLLECTION = 'settings';
const INVOICE_DOC_ID = 'invoice';

export interface InvoiceSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  currency: string;
  logoUrl: string;
  footerText: string;
}

const DEFAULTS: InvoiceSettings = {
  companyName: 'DCEENY Interior Design Studio',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  currency: FACTOR_CURRENCY,
  logoUrl: '/logo.ico',
  footerText: 'Thank you for your business!',
};

export function getDefaultInvoiceSettings(): InvoiceSettings {
  return { ...DEFAULTS };
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const ref = doc(db, SETTINGS_COLLECTION, INVOICE_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return getDefaultInvoiceSettings();
  const data = snap.data() as Record<string, unknown>;
  return {
    companyName: typeof data.companyName === 'string' ? data.companyName : DEFAULTS.companyName,
    companyAddress: typeof data.companyAddress === 'string' ? data.companyAddress : DEFAULTS.companyAddress,
    companyPhone: typeof data.companyPhone === 'string' ? data.companyPhone : DEFAULTS.companyPhone,
    companyEmail: typeof data.companyEmail === 'string' ? data.companyEmail : DEFAULTS.companyEmail,
    companyWebsite: typeof data.companyWebsite === 'string' ? data.companyWebsite : DEFAULTS.companyWebsite,
    currency: typeof data.currency === 'string' ? data.currency : DEFAULTS.currency,
    logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : DEFAULTS.logoUrl,
    footerText: typeof data.footerText === 'string' ? data.footerText : DEFAULTS.footerText,
  };
}

export async function setInvoiceSettings(settings: Partial<InvoiceSettings>): Promise<void> {
  const ref = doc(db, SETTINGS_COLLECTION, INVOICE_DOC_ID);
  const current = await getInvoiceSettings();
  const merged: InvoiceSettings = {
    companyName: settings.companyName ?? current.companyName,
    companyAddress: settings.companyAddress ?? current.companyAddress,
    companyPhone: settings.companyPhone ?? current.companyPhone,
    companyEmail: settings.companyEmail ?? current.companyEmail,
    companyWebsite: settings.companyWebsite ?? current.companyWebsite,
    currency: settings.currency ?? current.currency,
    logoUrl: settings.logoUrl ?? current.logoUrl,
    footerText: settings.footerText ?? current.footerText,
  };
  await setDoc(ref, merged, { merge: true });
}
