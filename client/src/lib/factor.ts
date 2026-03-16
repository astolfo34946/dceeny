import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Factor } from '../types/app';

/** Currency code used for all Factor amounts (e.g. DA = Algerian Dinar). */
export const FACTOR_CURRENCY = 'DA';

/** Format a number as amount with currency (e.g. "1 234.56 DA"). */
export function formatFactorAmount(value: number): string {
  return `${value.toFixed(2)} ${FACTOR_CURRENCY}`;
}

export async function getOrCreateFactorForCustomer(
  customerId: string,
): Promise<Factor> {
  const ref = doc(db, 'factors', customerId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as Record<string, unknown>;
    return {
      id: ref.id,
      customerId: (data.customerId as string) ?? customerId,
      createdAt: data.createdAt as string | undefined,
      totalPurchases: typeof data.totalPurchases === 'number' ? data.totalPurchases : 0,
      totalPaid: typeof data.totalPaid === 'number' ? data.totalPaid : 0,
      balance: typeof data.balance === 'number' ? data.balance : 0,
    };
  }

  const createdAt = new Date().toISOString();
  const initial = {
    customerId,
    createdAt,
    totalPurchases: 0,
    totalPaid: 0,
    balance: 0,
  };

  await setDoc(ref, initial, { merge: true });

  return { id: ref.id, ...initial };
}

/** Recompute factor totals from purchases + payments subcollections and update factor doc. */
export async function recomputeFactorTotals(factorId: string): Promise<void> {
  const factorRef = doc(db, 'factors', factorId);
  const [purchasesSnap, paymentsSnap] = await Promise.all([
    getDocs(collection(db, 'factors', factorId, 'purchases')),
    getDocs(collection(db, 'factors', factorId, 'payments')),
  ]);

  let totalPurchases = 0;
  purchasesSnap.forEach((d) => {
    const data = d.data() as { amount?: number; quantity?: number; unitPrice?: number };
    if (typeof data.amount === 'number') {
      totalPurchases += data.amount;
    } else if (
      typeof data.quantity === 'number' &&
      typeof data.unitPrice === 'number'
    ) {
      totalPurchases += Math.round(data.quantity * data.unitPrice * 100) / 100;
    }
  });

  let totalPaid = 0;
  paymentsSnap.forEach((d) => {
    const data = d.data() as { amount?: number };
    totalPaid += typeof data.amount === 'number' ? data.amount : 0;
  });

  const totalPurchasesRounded = Math.round(totalPurchases * 100) / 100;
  const totalPaidRounded = Math.round(totalPaid * 100) / 100;
  // Balance = Total Paid - Total Purchases (positive = credit, negative = amount owed).
  const balance = Math.round((totalPaidRounded - totalPurchasesRounded) * 100) / 100;

  await setDoc(
    factorRef,
    {
      totalPurchases: totalPurchasesRounded,
      totalPaid: totalPaidRounded,
      balance,
    },
    { merge: true },
  );
}
