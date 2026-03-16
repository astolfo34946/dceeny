import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { PROJECTS_3D_COLLECTION } from '../lib/useCustomerProject';
import { ReadOnlyPanorama } from '../viewer/ReadOnlyPanorama';
import type { ProjectGalleryImage } from '../types/app';

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
    label?: string;
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
  const [gallery, setGallery] = useState<ProjectGalleryImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const loadedThumbsRef = useRef<Set<string>>(new Set());
  const [, forceTick] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, PROJECTS_3D_COLLECTION, projectId, 'threeDScenes'),
      orderBy('order', 'asc'),
    );
    Promise.all([getDocs(q), getDoc(doc(db, PROJECTS_3D_COLLECTION, projectId))]).then(
      ([snap, projectSnap]) => {
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
        const pdata = (projectSnap.data() ?? {}) as Record<string, unknown>;
        const g = (pdata.gallery as ProjectGalleryImage[] | undefined) ?? [];
        setGallery(g.filter((x) => x && typeof x.url === 'string' && x.url.length > 0));
        setLoading(false);
      },
    );
  }, [projectId]);

  // Preload only the first 3 gallery images (fast first paint).
  useEffect(() => {
    const first = gallery.slice(0, 3);
    first.forEach((it) => {
      if (!it?.url) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = it.url;
    });
  }, [gallery]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (lightboxIndex == null) return;
      if (e.key === 'ArrowRight') {
        setLightboxIndex((i) => (i == null ? i : Math.min(gallery.length - 1, i + 1)));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => (i == null ? i : Math.max(0, i - 1)));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, gallery.length]);

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) ?? null,
    [scenes, activeSceneId],
  );

  // Build pano scenes in a stable way (must be ABOVE any early returns; hooks can't be conditional).
  const idToIndex = useMemo(() => new Map(scenes.map((s, i) => [s.id, i])), [scenes]);
  const panoScenes = useMemo(
    () =>
      scenes.map((s, i) => ({
        ...s,
        id: `scene_${i}`,
        weekNumber: 1,
        hotspots: s.hotspots?.map((h) => {
          const targetIndex = idToIndex.get(h.targetSceneId);
          const idx = typeof targetIndex === 'number' && targetIndex >= 0 ? targetIndex : 0;
          return {
            pitch: h.pitch,
            yaw: h.yaw,
            targetSceneId: `scene_${idx}`,
            type: (h.type === 'arrow' || h.type === 'circle' ? h.type : 'circle') as
              | 'circle'
              | 'arrow',
            rotation: h.rotation ?? 0,
            label: h.label,
          };
        }),
      })),
    [scenes, idToIndex],
  );
  const activeIndex = useMemo(
    () => scenes.findIndex((s) => s.id === activeSceneId),
    [scenes, activeSceneId],
  );
  const initialSceneId = useMemo(
    () => (activeIndex >= 0 ? `scene_${activeIndex}` : 'scene_0'),
    [activeIndex],
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(220px,1fr)]">
        <div
          data-viewer-root
          className="relative min-h-[320px] overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-lg md:min-h-[520px]"
        >
          <ReadOnlyPanorama
            projectId={projectId}
            scenes={panoScenes}
            initialSceneId={initialSceneId}
            onSceneChange={(id) => {
              const idx = id.startsWith('scene_') ? parseInt(id.slice(6), 10) : parseInt(id, 10);
              if (Number.isNaN(idx) || idx < 0 || idx >= scenes.length) return;
              setActiveSceneId(scenes[idx].id);
            }}
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

      {gallery.length > 0 && (
        <section className="mx-auto mt-8 w-full max-w-screen-lg pt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {t('customer_gallery_title', 'Gallery')}
            </h3>
            <p className="text-xs text-neutral-400 tabular-nums" dir="ltr">
              {gallery.length}
            </p>
          </div>

          {/* Responsive grid: 2 per row (mobile), 3 per row (desktop). */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
            {gallery.map((img, idx) => {
              const loaded = loadedThumbsRef.current.has(img.url);
              return (
                <button
                  key={img.url + idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-transform duration-200 will-change-transform hover:-translate-y-0.5 hover:shadow-md">
                    <div className="aspect-[4/3] bg-neutral-100">
                      <img
                        src={img.url}
                        alt={img.caption ?? ''}
                        loading={idx < 3 ? 'eager' : 'lazy'}
                        decoding="async"
                        onLoad={() => {
                          if (!loadedThumbsRef.current.has(img.url)) {
                            loadedThumbsRef.current.add(img.url);
                            forceTick((x) => x + 1);
                          }
                        }}
                        className={`h-full w-full object-cover transition-opacity duration-300 ${
                          loaded ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    </div>

                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="absolute inset-0 ring-1 ring-black/10" />
                    </div>

                    {img.caption ? (
                      <div className="border-t border-neutral-100 px-3 py-2">
                        <p className="truncate text-xs font-medium text-neutral-900">{img.caption}</p>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {lightboxIndex != null && gallery[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute right-0 top-0 -translate-y-12 rounded-full border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {t('common_close', 'Close')}
            </button>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <img
                src={gallery[lightboxIndex].url}
                alt={gallery[lightboxIndex].caption ?? ''}
                decoding="async"
                className="max-h-[75vh] w-full object-contain"
              />
              {gallery[lightboxIndex].caption ? (
                <div className="border-t border-white/10 px-4 py-3">
                  <p className="text-sm text-white/80">{gallery[lightboxIndex].caption}</p>
                </div>
              ) : null}
            </div>

            {gallery.length > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i == null ? i : Math.max(0, i - 1)))}
                  disabled={lightboxIndex <= 0}
                  className="rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-black disabled:opacity-40"
                >
                  {t('common_prev', 'Prev')}
                </button>
                <p className="text-xs text-white/50 tabular-nums" dir="ltr">
                  {lightboxIndex + 1} / {gallery.length}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((i) => (i == null ? i : Math.min(gallery.length - 1, i + 1)))
                  }
                  disabled={lightboxIndex >= gallery.length - 1}
                  className="rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-black disabled:opacity-40"
                >
                  {t('common_next', 'Next')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

