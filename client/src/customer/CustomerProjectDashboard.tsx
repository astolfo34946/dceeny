import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { trackProjectView } from '../lib/analytics';
import { ReadOnlyPanorama } from '../viewer/ReadOnlyPanorama';

interface Scene {
  id: string;
  imageUrl: string;
  roomName: string;
  weekNumber: number;
  order: number;
  hotspots?: {
    pitch: number;
    yaw: number;
    targetSceneId: string;
    type: 'circle' | 'arrow';
  }[];
}

interface Project {
  name: string;
  address: string;
}

interface Props {
  projectId: string;
}

export function CustomerProjectDashboard({ projectId }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(true);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      const projectRef = doc(db, 'projects', projectId);
      const snapshot = await getDoc(projectRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as Project;
        setProject(data);
      }
    }
    loadProject();
    trackProjectView(projectId);
  }, [projectId]);

  useEffect(() => {
    const scenesRef = collection(db, 'projects', projectId, 'scenes');
    const q = query(
      scenesRef,
      where('imageUrl', '!=', null),
      orderBy('weekNumber', 'asc'),
      orderBy('order', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next: Scene[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Scene, 'id'>;
        next.push({ id: docSnap.id, ...data });
      });
      setScenes(next);
      setLoadingScenes(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const weeks = useMemo(
    () => Array.from(new Set(scenes.map((s) => s.weekNumber))).sort((a, b) => a - b),
    [scenes],
  );

  useEffect(() => {
    if (weeks.length && activeWeek == null) {
      setActiveWeek(weeks[weeks.length - 1]);
    }
  }, [weeks, activeWeek]);

  const scenesForWeek = useMemo(
    () => scenes.filter((s) => s.weekNumber === activeWeek),
    [activeWeek, scenes],
  );

  useEffect(() => {
    if (!activeSceneId && scenesForWeek.length > 0) {
      setActiveSceneId(scenesForWeek[0].id);
    }
  }, [activeSceneId, scenesForWeek]);

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-8 md:py-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Project
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            {project?.name ?? 'Loading project...'}
          </h1>
          {project?.address && (
            <p className="text-sm text-neutral-600">{project.address}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(220px,1fr)]">
        <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-neutral-200 bg-black">
          {activeScene && activeWeek != null ? (
            <ReadOnlyPanorama
              key={activeScene.id}
              projectId={projectId}
              scenes={scenesForWeek}
              initialSceneId={activeScene.id}
            />
          ) : loadingScenes ? (
            <div className="flex h-full items-center justify-center bg-neutral-900">
              <div className="h-10 w-10 animate-pulse rounded-full border border-neutral-500" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-50 text-sm text-neutral-500">
              No 360° scenes available yet.
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-subtle backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Rooms
          </p>
          <div className="smooth-scrollbar flex max-h-[360px] flex-col gap-1 overflow-y-auto pr-1">
            {loadingScenes ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 animate-pulse rounded-lg bg-neutral-200"
                />
              ))
            ) : scenesForWeek.length === 0 ? (
              <p className="text-xs text-neutral-500">
                No rooms have been uploaded yet.
              </p>
            ) : (
              scenesForWeek.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setActiveSceneId(scene.id)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors duration-150 ease-smooth ${
                    activeSceneId === scene.id
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  <span>{scene.roomName}</span>
                  <span
                    className={
                      activeSceneId === scene.id
                        ? 'text-[10px] uppercase tracking-[0.18em]'
                        : 'text-[10px] uppercase tracking-[0.18em] text-neutral-500'
                    }
                  >
                    {scene.order + 1}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

