import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EditorPanorama } from '../viewer/EditorPanorama';

interface ProjectOption {
  id: string;
  name: string;
}

export interface SceneForEdit {
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
    rotation?: number;
  }[];
}

export function AdminScenes() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneForEdit[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | null>(
    null,
  );

  const [roomName, setRoomName] = useState('');
  const [weekNumber, setWeekNumber] = useState<number>(1);

  useEffect(() => {
    async function loadProjects() {
      const snap = await getDocs(collection(db, 'projects'));
      const options: ProjectOption[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        options.push({ id: d.id, name: data.name ?? 'Untitled project' });
      });
      setProjects(options);
      if (!activeProjectId && options.length > 0) {
        setActiveProjectId(options[0].id);
      }
    }
    loadProjects();
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    setLoadingScenes(true);
    const scenesRef = collection(db, 'projects', activeProjectId, 'scenes');
    const q = query(
      scenesRef,
      orderBy('weekNumber', 'asc'),
      orderBy('order', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: SceneForEdit[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        rows.push({
          id: d.id,
          imageUrl: data.imageUrl,
          roomName: data.roomName,
          weekNumber: data.weekNumber,
          order: data.order,
          hotspots: data.hotspots ?? [],
        });
      });
      setScenes(rows);
      setLoadingScenes(false);
      if (!selectedSceneId && rows.length > 0) {
        setSelectedSceneId(rows[0].id);
      }
    });
    return () => unsub();
  }, [activeProjectId, selectedSceneId]);

  const selectedScene = useMemo(
    () => scenes.find((s) => s.id === selectedSceneId) ?? null,
    [scenes, selectedSceneId],
  );

  const availableWeeks = useMemo(
    () =>
      Array.from(new Set(scenes.map((s) => s.weekNumber))).sort(
        (a, b) => a - b,
      ),
    [scenes],
  );

  useEffect(() => {
    if (!availableWeeks.length) {
      setSelectedWeekFilter(null);
      return;
    }
    if (selectedWeekFilter == null) {
      // Default to latest week when scenes first load.
      setSelectedWeekFilter(availableWeeks[availableWeeks.length - 1]);
    }
  }, [availableWeeks, selectedWeekFilter]);

  const scenesForFilter = useMemo(
    () =>
      selectedWeekFilter == null
        ? scenes
        : scenes.filter((s) => s.weekNumber === selectedWeekFilter),
    [scenes, selectedWeekFilter],
  );

  async function handleUpload(file: File) {
    if (!activeProjectId) return;
    const signUrl = import.meta.env.VITE_CLOUDINARY_SIGN_URL as string | undefined;
    if (!signUrl) {
      console.error('VITE_CLOUDINARY_SIGN_URL is not set');
      return;
    }
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
      | string
      | undefined;
    setUploading(true);
    setUploadProgress(1);
    try {
      const resSign = await fetch(signUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseAnonKey
            ? {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
              }
            : {}),
        },
        body: JSON.stringify({
          projectId: activeProjectId,
          fileName: file.name,
        }),
      });

      if (!resSign.ok) {
        throw new Error(`Sign request failed: ${resSign.statusText}`);
      }

      const {
        timestamp,
        signature,
        apiKey,
        cloudName,
      }: {
        timestamp: number;
        signature: string;
        apiKey: string;
        cloudName: string;
      } = await resSign.json();

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', `projects/${activeProjectId}`);

      const imageUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let progressTimer: number | null = null;
        let sawRealProgress = false;
        xhr.open(
          'POST',
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        );
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            sawRealProgress = true;
            if (progressTimer != null) {
              window.clearInterval(progressTimer);
              progressTimer = null;
            }
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };
        xhr.onload = () => {
          if (progressTimer != null) {
            window.clearInterval(progressTimer);
            progressTimer = null;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText) as {
                secure_url: string;
              };
              setUploadProgress(100);
              resolve(json.secure_url);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(
              new Error(`Cloudinary upload failed: ${xhr.statusText}`),
            );
          }
        };
        xhr.onerror = () => {
          if (progressTimer != null) {
            window.clearInterval(progressTimer);
            progressTimer = null;
          }
          reject(new Error('Network error during Cloudinary upload'));
        };

        progressTimer = window.setInterval(() => {
          if (sawRealProgress) return;
          setUploadProgress((p) => Math.min(95, Math.max(p, 1) + 1));
        }, 400);

        xhr.send(form);
      });

      const scenesRef = collection(db, 'projects', activeProjectId, 'scenes');
      const nextOrder =
        scenes.filter((s) => s.weekNumber === weekNumber).length;

      const sceneRef = doc(scenesRef);
      await setDoc(sceneRef, {
        imageUrl,
        roomName: roomName || 'Room',
        weekNumber,
        order: nextOrder,
        hotspots: [],
        createdAt: new Date().toISOString(),
      });

      setRoomName('');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveHotspots(
    sceneId: string,
    hotspots: SceneForEdit['hotspots'],
  ) {
    if (!activeProjectId) return;
    const sceneRef = doc(db, 'projects', activeProjectId, 'scenes', sceneId);

    // Store previous version for undo/version control.
    const versionRef = doc(
      collection(sceneRef, 'versions'),
    );

    await Promise.all([
      updateDoc(sceneRef, { hotspots }),
      setDoc(versionRef, {
        hotspots,
        savedAt: new Date().toISOString(),
      }),
    ]);
  }

  async function handleDeleteScene(sceneId: string) {
    if (!activeProjectId) return;
    const toDelete = scenes.find((s) => s.id === sceneId);
    if (!toDelete) return;
    const confirm = window.confirm(
      `Delete scene "${toDelete.roomName}" (week ${toDelete.weekNumber})?`,
    );
    if (!confirm) return;
    await deleteDoc(
      doc(db, 'projects', activeProjectId, 'scenes', sceneId),
    );
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-textLight">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Scenes &amp; Hotspots
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            Upload weekly 360° scenes, then add hotspots to move between rooms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            Project
          </label>
          <select
            value={activeProjectId ?? ''}
            onChange={(e) => {
              setActiveProjectId(e.target.value || null);
              setSelectedSceneId(null);
            }}
            className="min-w-[160px] rounded-md border border-neutral-700 bg-black px-3 py-1.5 text-xs text-neutral-100 outline-none transition-colors duration-150 ease-smooth focus:border-white"
          >
            {projects.length === 0 ? (
              <option value="">No projects</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(260px,1.3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-black/40 p-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
            Upload scene
          </p>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                Room name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Kitchen"
                className="mt-1 w-full rounded-md border border-neutral-700 bg-black px-3 py-2 text-xs text-neutral-100 outline-none transition-colors duration-150 ease-smooth focus:border-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                Week
              </label>
              <input
                type="number"
                min={1}
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value) || 1)}
                className="mt-1 w-24 rounded-md border border-neutral-700 bg-black px-3 py-2 text-xs text-neutral-100 outline-none transition-colors duration-150 ease-smooth focus:border-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                360° JPGs
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files || !files.length) return;
                  (async () => {
                    for (const file of Array.from(files)) {
                      await handleUpload(file);
                    }
                  })();
                  // reset input so selecting the same file again still triggers change
                  e.target.value = '';
                }}
                disabled={uploading || !activeProjectId}
                className="mt-1 block w-full text-xs text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:uppercase file:tracking-[0.16em] file:text-black hover:file:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            {uploading && (
              <div className="mt-2 w-full">
                <div className="h-1.5 w-full rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-150 ease-smooth"
                    style={{ width: `${Math.max(10, uploadProgress)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-neutral-400">
                  Uploading {uploadProgress}%
                </p>
              </div>
            )}
            <p className="text-[10px] text-neutral-500">
              Images are uploaded securely to Cloudinary using signed uploads via
              your signing endpoint.
            </p>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
              Scenes
            </p>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-neutral-400">
              <span className="uppercase tracking-[0.18em]">Week filter</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedWeekFilter(null)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    selectedWeekFilter == null
                      ? 'bg-white text-black'
                      : 'bg-transparent text-neutral-300 hover:bg-neutral-900'
                  }`}
                >
                  All
                </button>
                {availableWeeks.map((week) => (
                  <button
                    key={week}
                    type="button"
                    onClick={() => setSelectedWeekFilter(week)}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      selectedWeekFilter === week
                        ? 'bg-white text-black'
                        : 'bg-transparent text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    W{week}
                  </button>
                ))}
              </div>
            </div>
            <div className="smooth-scrollbar flex max-h-[260px] flex-col gap-1 overflow-y-auto pr-1">
              {loadingScenes ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-9 animate-pulse rounded-md bg-neutral-900"
                  />
                ))
              ) : scenesForFilter.length === 0 ? (
                <p className="text-[11px] text-neutral-500">
                  No scenes for this week yet. Upload your first 360° image
                  above.
                </p>
              ) : (
                scenesForFilter.map((scene) => (
                  <div
                    key={scene.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSceneId(scene.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedSceneId(scene.id);
                      }
                    }}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-[11px] transition-colors duration-150 ease-smooth ${
                      scene.id === selectedSceneId
                        ? 'border-white bg-white text-black'
                        : 'border-neutral-800 bg-black/60 text-neutral-100 hover:border-neutral-500'
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <span className="truncate">
                        W{scene.weekNumber} · {scene.roomName}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                        #{scene.order + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScene(scene.id);
                      }}
                      className="ml-2 rounded border border-neutral-700 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-neutral-400 hover:border-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-neutral-800 bg-black">
          {selectedScene && activeProjectId ? (
            <EditorPanorama
              key={selectedScene.id}
              projectId={activeProjectId}
              scene={selectedScene}
              scenes={scenes}
              onChangeHotspots={(hotspots) =>
                handleSaveHotspots(selectedScene.id, hotspots)
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-neutral-500">
              Select a scene to edit its hotspots.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

