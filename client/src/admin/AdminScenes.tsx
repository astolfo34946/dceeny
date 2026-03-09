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
import { EditorPanorama, type EditableHotspot, type EditableScene } from '../viewer/EditorPanorama';

interface ProjectOption {
  id: string;
  name: string;
}

export type SceneForEdit = EditableScene & { weekNumber: number };

export function AdminScenes() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneForEdit[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  const [roomName, setRoomName] = useState('');
  // Internal grouping, fixed to 1 for 3D (no weeks in UI).
  const [weekNumber] = useState<number>(1);

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
    hotspots: EditableHotspot[] | undefined,
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
      `Delete scene "${toDelete.roomName}"?`,
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">
            3D
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Upload 360° scenes and add hotspots to move between rooms.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
              Project
            </label>
            <select
              value={activeProjectId ?? ''}
              onChange={(e) => {
                setActiveProjectId(e.target.value || null);
                setSelectedSceneId(null);
              }}
              className="mt-1 w-64 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
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
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
        {/* Left column: upload + scene list */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
              Upload scene
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Room name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Kitchen"
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
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
                    e.target.value = '';
                  }}
                  disabled={uploading || !activeProjectId}
                  className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-wider file:text-white hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {uploading && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200" dir="ltr">
                    <div
                      className="h-full bg-black transition-[width] duration-300"
                      style={{ width: `${Math.max(10, uploadProgress)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Uploading <span className="tabular-nums">{uploadProgress}%</span>
                  </p>
                </div>
              )}

              <p className="text-xs text-neutral-500">
                Images are uploaded securely to Cloudinary using signed uploads.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
                Scenes
              </h2>
            </div>

            <div className="p-3">
              {loadingScenes ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
                  ))}
                </div>
              ) : scenes.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-neutral-500">
                  No 3D scenes yet. Upload your first 360° image above.
                </div>
              ) : (
                <ul className="smooth-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {scenes.map((scene) => (
                    <li key={scene.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedSceneId(scene.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                          scene.id === selectedSceneId
                            ? 'border-black bg-black text-white'
                            : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {scene.roomName}
                        </span>
                        <span
                          className={`shrink-0 text-xs tabular-nums ${
                            scene.id === selectedSceneId ? 'text-white/80' : 'text-neutral-500'
                          }`}
                        >
                          #{scene.order + 1}
                        </span>
                      </button>

                      <div className="mt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScene(scene.id);
                          }}
                          className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Right column: hotspot editor */}
        <section className="relative min-h-[360px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
            <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center text-sm text-neutral-500">
              Select a scene to edit its hotspots.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

