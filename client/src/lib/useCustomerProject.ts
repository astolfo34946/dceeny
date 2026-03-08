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
        setProject({ id: doc.id, ...doc.data() } as Project);
      } else {
        setProject(null);
      }
      setLoading(false);
    });
  }, [customerId]);

  return { project, loading };
}
