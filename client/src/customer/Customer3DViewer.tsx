import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { ReadOnlyPanorama } from '../viewer/ReadOnlyPanorama';

interface SceneDoc {
  id: string;
  imageUrl: string;
  roomName: string;
  order: number;
  hotspots?: {
    pitch: number;
    yaw: number;
    targetSceneId: string;
    type: 'circle' | 'arrow';
    rotation?: number;
  }[];
}

interface Props {
  projectId: string;
}

export function Customer3DViewer({ projectId }: Props) {
  const { t } = useTranslation();
  const [scenes, setScenes] = useState<SceneDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'projects', projectId, 'threeDScenes'),
      orderBy('order', 'asc'),
    );
    getDocs(q).then((snap) => {
      const rows: SceneDoc[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          imageUrl: (data.imageUrl as string) ?? '',
          roomName: (data.roomName as string) ?? '',
          order: typeof data.order === 'number' ? data.order : 0,
          hotspots: (data.hotspots as SceneDoc['hotspots']) ?? [],
        };
      });
      setScenes(rows);
      setActiveSceneId(rows[0]?.id ?? null);
      setLoading(false);
    });
  }, [projectId]);

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) ?? null,
    [scenes, activeSceneId],
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  if (!scenes.length || !activeScene) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
          <img src="/logo.ico" alt="" className="mx-auto mb-4 h-10 w-10 opacity-60" />
          <p className="text-sm text-neutral-700">
            {t('customer_3d_empty', 'No 3D scenes yet.')}
          </p>
        </div>
      </div>
    );
  }

  // ReadOnlyPanorama expects weekNumber, but it is not used for rendering.
  const panoScenes = scenes.map((s) => ({ ...s, weekNumber: 1 }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(220px,1fr)]">
        <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-lg md:min-h-[520px]">
          <ReadOnlyPanorama
            projectId={projectId}
            scenes={panoScenes}
            initialSceneId={activeScene.id}
          />
        </div>

        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {t('customer_360_rooms_title')}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            {t('customer_360_rooms_subtitle')}
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {scenes.map((scene) => (
              <li key={scene.id}>
                <button
                  type="button"
                  onClick={() => setActiveSceneId(scene.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                    activeSceneId === scene.id
                      ? 'border-black bg-black text-white shadow-md'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <span className="truncate font-medium">{scene.roomName}</span>
                  <span
                    className={`ml-2 shrink-0 text-xs font-medium tabular-nums ${
                      activeSceneId === scene.id ? 'text-white/90' : 'text-neutral-500'
                    }`}
                  >
                    {scene.order + 1} / {scenes.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

