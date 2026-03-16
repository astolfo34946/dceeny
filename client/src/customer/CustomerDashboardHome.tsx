import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { DashboardCards } from '../components/DashboardCards';

export function CustomerDashboardHome() {
  const { user } = useAuth();
  const [is360Unlocked, setIs360Unlocked] = useState(false);
  const [is3DUnlocked, setIs3DUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const projectsQ = query(
      collection(db, 'projects'),
      where('customerId', '==', user.id),
    );
    const projects3dQ = query(
      collection(db, 'projects3d'),
      where('customerId', '==', user.id),
    );
    Promise.all([getDocs(projectsQ), getDocs(projects3dQ)]).then(([projSnap, proj3dSnap]) => {
      const first360 = projSnap.docs[0];
      const first3d = proj3dSnap.docs[0];
      setIs360Unlocked(first360 ? (first360.data() as { is360Unlocked?: boolean }).is360Unlocked === true : false);
      setIs3DUnlocked(first3d ? (first3d.data() as { is3DUnlocked?: boolean }).is3DUnlocked === true : false);
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
      is3DLocked={!is3DUnlocked}
      isAdmin={false}
      userName={firstName}
      threeDHref="/app/3d"
    />
  );
}
