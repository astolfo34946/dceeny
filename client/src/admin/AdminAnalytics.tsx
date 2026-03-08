import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ProjectAnalyticsRow {
  id: string;
  name: string;
  totalViews: number;
  lastViewedAt?: string;
}

export function AdminAnalytics() {
  const [rows, setRows] = useState<ProjectAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const snap = await getDocs(collection(db, 'projects'));
      const next: ProjectAnalyticsRow[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        next.push({
          id: docSnap.id,
          name: data.name ?? 'Untitled project',
          totalViews: data.totalViews ?? 0,
          lastViewedAt: data.lastViewedAt,
        });
      });
      setRows(next);
      setLoading(false);
    }
    load();
  }, []);

  const totalViewsAll = useMemo(
    () => rows.reduce((sum, r) => sum + (r.totalViews || 0), 0),
    [rows],
  );

  return (
    <div className="flex flex-col gap-4 text-sm text-textLight">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Analytics
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Track how often clients open their 360° walk-throughs.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-black/40 p-4">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
              Total views
            </p>
            <p className="text-2xl font-semibold text-white">
              {loading ? '—' : totalViewsAll}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)] border-b border-neutral-800 bg-black/80 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
            <div>Project</div>
            <div>Views</div>
            <div>Last viewed</div>
          </div>
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-8 animate-pulse rounded bg-neutral-900"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-3 text-[11px] text-neutral-500">
              No analytics yet. Once clients start viewing their projects,
              metrics will appear here.
            </div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)] items-center gap-3 px-3 py-2 text-xs"
                >
                  <div className="truncate text-neutral-100">
                    {row.name}
                  </div>
                  <div className="text-neutral-100">{row.totalViews}</div>
                  <div className="text-[11px] text-neutral-400">
                    {row.lastViewedAt
                      ? new Date(row.lastViewedAt).toLocaleString()
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

