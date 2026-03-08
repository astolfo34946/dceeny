import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { useCustomerProject } from '../lib/useCustomerProject';
import { useAuth } from '../auth/AuthContext';
import { WeekPanoramaViewer } from '../viewer/WeekPanoramaViewer';
import type { Week } from '../types/app';

export function Customer360Viewer() {
  const { t } = useTranslation();
  const { weekId } = useParams<{ weekId: string }>();
  const { user } = useAuth();
  const { project, loading: projectLoading } = useCustomerProject(user?.id);
  const [week, setWeek] = useState<Week | null>(null);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [entryDone, setEntryDone] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  useEffect(() => {
    if (!project?.id || !weekId) {
      setWeek(null);
      setLoadingWeek(false);
      return;
    }
    getDoc(doc(db, 'projects', project.id, 'weeks', weekId)).then((snap) => {
      if (snap.exists()) {
        setWeek({
          id: snap.id,
          ...snap.data(),
          createdAt: (snap.data().createdAt as string) || '',
        } as Week);
      } else {
        setWeek(null);
      }
      setLoadingWeek(false);
    });
  }, [project?.id, weekId]);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntryDone(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  // When week data loads, choose main scene (if any) as the initial one.
  useEffect(() => {
    if (!week) return;
    const scenes = week.scenes ?? [];
    if (!scenes.length) return;
    const mainIndex = scenes.findIndex((s) => s.isMain);
    setActiveSceneIndex(mainIndex >= 0 ? mainIndex : 0);
  }, [week]);

  if (projectLoading || loadingWeek || !week) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  const scenes = week.scenes || [];
  const hasScenes = scenes.length > 0 && scenes.every((s) => s.imageUrl);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-50">
      {/* Header */}
      <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-4 shadow-sm md:px-6">
        <Link
          to="/app/360"
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm transition-colors hover:border-black hover:bg-neutral-50 hover:text-black"
        >
          <span
            aria-hidden
            className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white"
          >
            ←
          </span>
          {t('customer_360_viewer_back')}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-black md:text-2xl">
          {week.title}
        </h1>
        {week.createdAt && (
          <p className="mt-0.5 text-xs text-neutral-500">
            {new Date(week.createdAt).toLocaleDateString(undefined, {
              dateStyle: 'medium',
            })}
          </p>
        )}
      </div>

      {/* Main content: viewer + rooms */}
      <div
        className="flex min-h-0 flex-1 flex-col px-4 py-4 md:flex-row md:gap-6 md:px-6 md:py-6"
        style={{
          opacity: entryDone ? 1 : 0,
          transform: entryDone ? 'translateY(0)' : 'translateY(4px)',
          transition:
            'opacity 0.4s cubic-bezier(0.22, 0.61, 0.36, 1), transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {hasScenes ? (
          <>
            {/* 360 viewer - left, takes remaining space */}
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-lg min-h-[320px] h-[55vh] md:min-h-[420px] md:h-[65vh]">
              <WeekPanoramaViewer
                scenes={scenes}
                initialSceneIndex={activeSceneIndex}
                onSceneIndexChange={setActiveSceneIndex}
              />
            </div>

            {/* Rooms list - right, fixed width */}
            <aside className="mt-4 w-full shrink-0 md:mt-0 md:w-80">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  {t('customer_360_rooms_title')}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {t('customer_360_rooms_subtitle')}
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {scenes.map((scene, index) => (
                    <li key={`${scene.roomName}-${index}`}>
                      <button
                        type="button"
                        onClick={() => setActiveSceneIndex(index)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                          activeSceneIndex === index
                            ? 'border-black bg-black text-white shadow-md'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <span className="truncate font-medium">
                          {scene.roomName}
                        </span>
                        <span
                          className={`ml-2 shrink-0 text-xs font-medium tabular-nums ${
                            activeSceneIndex === index
                              ? 'text-white/90'
                              : 'text-neutral-500'
                          }`}
                        >
                          {index + 1} / {scenes.length}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-neutral-200 bg-white py-16 text-center">
            <div className="max-w-sm px-4">
              <p className="text-sm font-medium text-neutral-700">
                {t('customer_360_no_scenes_title')}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {t('customer_360_no_scenes_subtitle')}
              </p>
              <Link
                to="/app/360"
                className="mt-4 inline-block rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                {t('customer_360_viewer_back')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
