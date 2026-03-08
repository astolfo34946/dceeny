import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type AppUserRole = 'admin' | 'customer';

export interface AppUser {
  id: string;
  firebaseUser: User;
  name: string;
  email: string;
  role: AppUserRole;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      const maxAttempts = 3;
      const delayMs = 400;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const snapshot = await getDoc(userRef);

          if (snapshot.exists()) {
            const data = snapshot.data() as {
              name?: string;
              email?: string;
              role?: AppUserRole;
            };

            setUser({
              id: snapshot.id,
              firebaseUser,
              name: data.name ?? firebaseUser.displayName ?? '',
              email: data.email ?? firebaseUser.email ?? '',
              role: data.role ?? 'customer',
            });
            setLoading(false);
            return;
          }

          // Doc not found: may be race after signup (setDoc still in progress). Retry.
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, delayMs));
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to load user profile', error);
          setUser(null);
          break;
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

