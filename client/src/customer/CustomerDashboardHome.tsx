import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { DashboardCards } from '../components/DashboardCards';

export function CustomerDashboardHome() {
  const { user } = useAuth();
  const [is360Unlocked, setIs360Unlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'projects'),
      where('customerId', '==', user.id)
    );
    getDocs(q).then((snap) => {
      const first = snap.docs[0];
      setIs360Unlocked(first ? (first.data() as { is360Unlocked?: boolean }).is360Unlocked === true : false);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  const firstName = user?.name?.trim().split(/\s+/)[0] || undefined;

  return (
    <DashboardCards
      factorHref="/app/factor"
      dceeny360Href="/app/360"
      is360Locked={!is360Unlocked}
      isAdmin={false}
      userName={firstName}
    />
  );
}
