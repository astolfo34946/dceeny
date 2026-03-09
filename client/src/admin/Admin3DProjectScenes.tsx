import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { EditorPanorama, type EditableHotspot, type EditableScene } from '../viewer/EditorPanorama';

type SceneDoc = EditableScene;

export function Admin3DProjectScenes() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const [projectName, setProjectName] = useState('');
  const [scenes, setScenes] = useState<SceneDoc[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [roomName, setRoomName] = useState('');

  const selectedScene = useMemo(
    () => scenes.find((s) => s.id === selectedSceneId) ?? null,
    [scenes, selectedSceneId],
  );

  useEffect(() => {
    if (!projectId) return;
    getDoc(doc(db, 'projects', projectId)).then((snap) => {
      setProjectName(snap.exists() ? ((snap.data() as { name?: string }).name ?? '') : '');
    });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
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
          hotspots: (data.hotspots as EditableHotspot[] | undefined) ?? [],
        };
      });
      setScenes(rows);
      setSelectedSceneId((prev) => prev ?? (rows[0]?.id ?? null));
      setLoading(false);
    });
  }, [projectId]);

  async function handleUpload(file: File) {
    if (!projectId) return;
    const signUrl = import.meta.env.VITE_CLOUDINARY_SIGN_URL as string | undefined;
    if (!signUrl) throw new Error('VITE_CLOUDINARY_SIGN_URL is not set');
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    setUploading(true);
    setUploadProgress(1);
    try {
      const resSign = await fetch(signUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseAnonKey
            ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
            : {}),
        },
        body: JSON.stringify({ projectId, fileName: file.name }),
      });
      if (!resSign.ok) throw new Error(`Sign request failed: ${resSign.statusText}`);

      const { timestamp, signature, apiKey, cloudName } = (await resSign.json()) as {
        timestamp: number;
        signature: string;
        apiKey: string;
        cloudName: string;
      };

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', `projects/${projectId}/3d`);

      const imageUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let progressTimer: number | null = null;
        let sawRealProgress = false;
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            sawRealProgress = true;
            if (progressTimer != null) window.clearInterval(progressTimer);
            progressTimer = null;
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          if (progressTimer != null) window.clearInterval(progressTimer);
          progressTimer = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText) as { secure_url: string };
              setUploadProgress(100);
              resolve(json.secure_url);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(xhr.statusText));
          }
        };
        xhr.onerror = () => {
          if (progressTimer != null) window.clearInterval(progressTimer);
          progressTimer = null;
          reject(new Error('Network error'));
        };

        progressTimer = window.setInterval(() => {
          if (sawRealProgress) return;
          setUploadProgress((p) => Math.min(95, Math.max(p, 1) + 1));
        }, 400);

        xhr.send(form);
      });

      const nextOrder = scenes.length;
      const sceneRef = doc(collection(db, 'projects', projectId, 'threeDScenes'));
      const docData: Omit<SceneDoc, 'id'> & { createdAt: string } = {
        imageUrl,
        roomName: roomName.trim() || t('common_room'),
        order: nextOrder,
        hotspots: [],
        createdAt: new Date().toISOString(),
      };
      await setDoc(sceneRef, docData);
      setScenes((prev) => [...prev, { id: sceneRef.id, ...docData }]);
      setSelectedSceneId(sceneRef.id);
      setRoomName('');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleSaveHotspots(sceneId: string, hotspots: EditableHotspot[] | undefined) {
    if (!projectId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId, 'threeDScenes', sceneId), { hotspots });
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, hotspots } : s)));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteScene(sceneId: string) {
    if (!projectId) return;
    const toDelete = scenes.find((s) => s.id === sceneId);
    if (!toDelete) return;
    if (!window.confirm(t('admin_3d_delete_scene_confirm', { name: toDelete.roomName }))) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'threeDScenes', sceneId));
      const remaining = scenes.filter((s) => s.id !== sceneId);
      // Re-pack order so it stays stable (0..n-1).
      const repacked = remaining.map((s, idx) => ({ ...s, order: idx }));
      await Promise.all(
        repacked.map((s) =>
          updateDoc(doc(db, 'projects', projectId, 'threeDScenes', s.id), { order: s.order }),
        ),
      );
      setScenes(repacked);
      setSelectedSceneId(repacked[0]?.id ?? null);
    } finally {
      setSaving(false);
    }
  }

  if (!projectId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/3d"
          className="text-xs font-medium uppercase tracking-wider text-neutral-600 hover:text-black"
        >
          ← {t('admin_3d_back')}
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {projectName || t('admin_3d_title')} · {t('admin_3d_scenes_title_suffix')}
        </h1>
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
            {t('admin_project_weeks_uploading_label')}{' '}
            <span dir="ltr" className="tabular-nums">
              {uploadProgress}%
            </span>
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
              {t('admin_3d_upload_title')}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {t('admin_project_weeks_room_name_placeholder')}
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {t('admin_3d_upload_images_label')}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg"
                  disabled={uploading || saving}
                  className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-wider file:text-white hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = '';
                  }}
                />
              </div>
              <p className="text-xs text-neutral-500">
                {t('admin_3d_upload_help')}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
                {t('admin_3d_scenes_list_title')}
              </h2>
            </div>
            <div className="p-3">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
                  ))}
                </div>
              ) : scenes.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-neutral-500">
                  {t('admin_3d_scenes_empty')}
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
                          onClick={() => handleDeleteScene(scene.id)}
                          disabled={saving}
                          className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
                        >
                          {t('admin_projects_delete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <section className="relative min-h-[360px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {selectedScene ? (
            <EditorPanorama
              key={selectedScene.id}
              projectId={projectId}
              scene={selectedScene}
              scenes={scenes}
              onChangeHotspots={(hotspots) => handleSaveHotspots(selectedScene.id, hotspots)}
            />
          ) : (
            <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center text-sm text-neutral-500">
              {t('admin_3d_select_scene_hint')}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

