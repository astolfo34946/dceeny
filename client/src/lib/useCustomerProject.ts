import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Project } from '../types/app';

export function useCustomerProject(customerId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(!!customerId);

  useEffect(() => {
    if (!customerId) {
      setProject(null);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'projects'),
      where('customerId', '==', customerId)
    );
    getDocs(q).then((snap) => {
      const doc = snap.docs[0];
      if (doc) {
        const data = doc.data() as Record<string, unknown>;
        setProject({
          id: doc.id,
          ...(data as any),
          is360Unlocked: data.is360Unlocked === true,
          is3DUnlocked: data.is3DUnlocked === true,
        } as Project);
      } else {
        setProject(null);
      }
      setLoading(false);
    });
  }, [customerId]);

  return { project, loading };
}

/** Firestore collection name for 3D projects (separate from 360 "projects"). */
export const PROJECTS_3D_COLLECTION = 'projects3d';

/** Hook to get the 3D project assigned to a customer (from projects3d collection). */
export function useCustomer3DProject(customerId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(!!customerId);

  useEffect(() => {
    if (!customerId) {
      setProject(null);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, PROJECTS_3D_COLLECTION),
      where('customerId', '==', customerId),
    );
    getDocs(q).then((snap) => {
      const doc = snap.docs[0];
      if (doc) {
        const data = doc.data() as Record<string, unknown>;
        setProject({
          id: doc.id,
          ...(data as any),
          is360Unlocked: false,
          is3DUnlocked: data.is3DUnlocked === true,
        } as Project);
      } else {
        setProject(null);
      }
      setLoading(false);
    });
  }, [customerId]);

  return { project, loading };
}
