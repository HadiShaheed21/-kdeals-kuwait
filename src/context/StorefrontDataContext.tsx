'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createSeedStore, readAdminStore, type AdminStoreData } from '@/lib/admin-repository';

const StorefrontDataContext = createContext<AdminStoreData | null>(null);

export function StorefrontDataProvider({ children, initialStore, source = 'local' }: { children: ReactNode; initialStore?: AdminStoreData; source?: 'local' | 'supabase' }) {
  // Use the seed during SSR and the first client render so hydration is deterministic.
  const [store, setStore] = useState<AdminStoreData>(() => initialStore ?? createSeedStore());

  useEffect(() => {
    // Supabase data is supplied by the server under an explicit feature flag.
    // Never replace it with browser-local CMS data after hydration.
    if (source === 'supabase') return;
    const sync = () => setStore(readAdminStore());
    const frame = requestAnimationFrame(sync);
    window.addEventListener('storage', sync);
    window.addEventListener('kdeals-admin-store', sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('storage', sync);
      window.removeEventListener('kdeals-admin-store', sync);
    };
  }, [source]);

  return <StorefrontDataContext.Provider value={store}>{children}</StorefrontDataContext.Provider>;
}

export function useStorefrontData(): AdminStoreData {
  const store = useContext(StorefrontDataContext);
  if (!store) throw new Error('useStorefrontData must be used within StorefrontDataProvider');
  return store;
}
