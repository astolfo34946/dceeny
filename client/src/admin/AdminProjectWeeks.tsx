import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { SceneHotspotEditor } from '../viewer/SceneHotspotEditor';
import type { Week, WeekScene } from '../types/app';

export function AdminProjectWeeks() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const [projectName, setProjectName] = useState('');
  const [weeks, setWeeks] = useState<(Week & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWeekNumber, setNewWeekNumber] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    getDoc(doc(db, 'projects', projectId)).then((snap) => {
      setProjectName(
        snap.exists() ? (snap.data() as { name?: string }).name ?? t('common_project') : ''
      );
    });
    const q = query(
      collection(db, 'projects', projectId, 'weeks'),
      orderBy('createdAt', 'asc')
    );
    getDocs(q).then((snap) => {
      setWeeks(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: (d.data().createdAt as string) || '',
        })) as (Week & { id: string })[]
      );
      setLoading(false);
    });
  }, [projectId, t]);

  async function handleCreateWeek(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !newTitle.trim()) return;
    setSaving(true);
    try {
      const ref = await addDoc(
        collection(db, 'projects', projectId, 'weeks'),
        {
          weekNumber: newWeekNumber,
          title: newTitle.trim(),
          createdAt: new Date().toISOString(),
          scenes: [],
        }
      );
      setWeeks((prev) => [
        ...prev,
        {
          id: ref.id,
          weekNumber: newWeekNumber,
          title: newTitle.trim(),
          createdAt: new Date().toISOString(),
          scenes: [],
        },
      ]);
      setNewTitle('');
      setNewWeekNumber((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File, weekId: string, roomName: string) {
    if (!projectId) return;
    const signUrl = import.meta.env.VITE_CLOUDINARY_SIGN_URL as string | undefined;
    if (!signUrl) {
      throw new Error('VITE_CLOUDINARY_SIGN_URL is not set');
    }
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
      | string
      | undefined;

    setUploading(true);
    // Some browsers / setups don't emit upload progress events for multipart uploads,
    // and we also spend time signing before the upload begins. Start non-zero so
    // the UI doesn't appear stuck at 0%.
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
          projectId,
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
      form.append('folder', `projects/${projectId}`);

      const imageUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let progressTimer: number | null = null;
        let sawRealProgress = false;
        xhr.open(
          'POST',
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
        );
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            sawRealProgress = true;
            if (progressTimer != null) {
              window.clearInterval(progressTimer);
              progressTimer = null;
            }
            const percent = Math.round((e.loaded / e.total) * 100);
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
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(xhr.statusText));
          }
        };
        xhr.onerror = () => {
          if (progressTimer != null) {
            window.clearInterval(progressTimer);
            progressTimer = null;
          }
          reject(new Error('Network error'));
        };

        // If progress events never fire, creep up to 95% so the UI shows activity.
        progressTimer = window.setInterval(() => {
          if (sawRealProgress) return;
          setUploadProgress((p) => Math.min(95, Math.max(p, 1) + 1));
        }, 400);

        xhr.send(form);
      });

      const weekRef = doc(db, 'projects', projectId, 'weeks', weekId);
      const weekSnap = await getDoc(weekRef);
      const currentScenes: WeekScene[] =
        (weekSnap.data()?.scenes as WeekScene[]) ?? [];
      const isFirstScene = currentScenes.length === 0;
      const newScene: WeekScene = {
        imageUrl,
        roomName: roomName.trim() || t('common_room'),
        hotspots: [],
        // First uploaded scene becomes main by default; others are normal
        ...(isFirstScene ? { isMain: true } : {}),
      };
      const nextScenes = isFirstScene
        ? [newScene]
        : [...currentScenes, newScene];
      await updateDoc(weekRef, {
        scenes: nextScenes,
      });
      setWeeks((prev) =>
        prev.map((w) =>
          w.id === weekId ? { ...w, scenes: nextScenes } : w
        )
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDeleteWeek(weekId: string) {
    if (
      !projectId ||
      !window.confirm(t('admin_project_weeks_delete_week_confirm'))
    )
      return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'weeks', weekId));
      setWeeks((prev) => prev.filter((w) => w.id !== weekId));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveHotspots(
    weekId: string,
    sceneIndex: number,
    hotspots: WeekScene['hotspots']
  ) {
    if (!projectId) return;
    const week = weeks.find((w) => w.id === weekId);
    if (!week || !week.scenes[sceneIndex]) return;
    const nextScenes = [...week.scenes];
    nextScenes[sceneIndex] = { ...nextScenes[sceneIndex], hotspots };
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId, 'weeks', weekId), {
        scenes: nextScenes,
      });
      setWeeks((prev) =>
        prev.map((w) =>
          w.id === weekId ? { ...w, scenes: nextScenes } : w
        )
      );
      setEditingWeekId(null);
      setEditingSceneIndex(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteScene(weekId: string, sceneIndex: number) {
    if (!projectId || !window.confirm(t('admin_project_weeks_remove_scene_confirm')))
      return;
    const week = weeks.find((w) => w.id === weekId);
    if (!week) return;
    const nextScenes = week.scenes.filter((_, i) => i !== sceneIndex);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId, 'weeks', weekId), {
        scenes: nextScenes,
      });
      setWeeks((prev) =>
        prev.map((w) => (w.id === weekId ? { ...w, scenes: nextScenes } : w))
      );
      if (editingSceneIndex === sceneIndex && editingWeekId === weekId) {
        setEditingWeekId(null);
        setEditingSceneIndex(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSetMainScene(weekId: string, sceneIndex: number) {
    if (!projectId) return;
    const week = weeks.find((w) => w.id === weekId);
    if (!week || !week.scenes[sceneIndex]) return;

    const nextScenes: WeekScene[] = week.scenes.map((scene, idx) => ({
      ...scene,
      isMain: idx === sceneIndex,
    }));

    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectId, 'weeks', weekId), {
        scenes: nextScenes,
      });
      setWeeks((prev) =>
        prev.map((w) =>
          w.id === weekId ? { ...w, scenes: nextScenes } : w
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (!projectId) return null;

  const editingWeek = weeks.find((w) => w.id === editingWeekId);
  const editingScene =
    editingWeek && editingSceneIndex != null
      ? editingWeek.scenes[editingSceneIndex]
      : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/projects"
          className="text-xs font-medium uppercase tracking-wider text-neutral-600 hover:text-black"
        >
          ← {t('admin_project_weeks_back')}
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {projectName} · {t('admin_project_weeks_title_suffix')}
        </h1>
      </div>

      {/* Create week */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-600">
          {t('admin_project_weeks_add_week_title')}
        </h2>
        <form
          onSubmit={handleCreateWeek}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
              {t('admin_project_weeks_week_number')}
            </label>
            <input
              type="number"
              min={1}
              value={newWeekNumber}
              onChange={(e) => setNewWeekNumber(Number(e.target.value) || 1)}
              className="mt-1 w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
              {t('admin_project_weeks_week_title_label')}
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('admin_project_weeks_week_title_placeholder')}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t('admin_project_weeks_create_week')}
          </button>
        </form>
      </section>

      {uploading && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
            dir="ltr"
          >
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

      {/* Hotspot editor (when editing a scene) */}
      {editingWeek && editingScene && editingSceneIndex != null && (
        <section>
          <SceneHotspotEditor
            scene={editingScene}
            sceneIndex={editingSceneIndex}
            scenes={editingWeek.scenes}
            onSave={(hotspots) =>
              handleSaveHotspots(editingWeekId!, editingSceneIndex, hotspots)
            }
            onCancel={() => {
              setEditingWeekId(null);
              setEditingSceneIndex(null);
            }}
          />
        </section>
      )}

      {/* Scenes & Hotspots per week */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-600">
          {t('admin_project_weeks_section_title')}
        </h2>
        <p className="mb-6 text-xs text-neutral-500">
          {t('admin_project_weeks_section_help')}
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-neutral-100"
              />
            ))}
          </div>
        ) : weeks.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-500">
            {t('admin_project_weeks_empty')}
          </div>
        ) : (
          <ul className="space-y-6">
            {weeks.map((week) => (
              <li
                key={week.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      {t('customer_360_week_label', { number: week.weekNumber })}
                    </span>
                    <h3 className="font-semibold text-black">{week.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-neutral-500">{t('admin_project_weeks_add_360_photo')}</span>
                      <input
                        type="text"
                        placeholder={t('admin_project_weeks_room_name_placeholder')}
                        id={`room-${week.id}`}
                        className="w-28 rounded border border-neutral-300 px-2 py-1.5 text-xs"
                      />
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg"
                        disabled={uploading}
                        className="text-xs file:rounded file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-white file:uppercase"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          const roomInput = document.getElementById(
                            `room-${week.id}`
                          ) as HTMLInputElement | null;
                          if (f)
                            handleUpload(
                              f,
                              week.id,
                              roomInput?.value ?? t('common_room')
                            );
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteWeek(week.id)}
                      disabled={saving}
                      className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {t('admin_project_weeks_delete_week')}
                    </button>
                  </div>
                </div>

                {(week.scenes ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 py-6 text-center text-xs text-neutral-500">
                    {t('admin_project_weeks_no_scenes_in_week')}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(week.scenes ?? []).map((scene, sceneIndex) => (
                      <div
                        key={sceneIndex}
                        className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-black">
                            {scene.roomName}
                          </p>
                          {scene.isMain && (
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600">
                              {t('admin_project_weeks_main_label')}
                            </p>
                          )}
                          <p className="text-[10px] text-neutral-500">
                            {t('admin_project_weeks_hotspots_count', {
                              count: (scene.hotspots ?? []).length,
                            })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetMainScene(week.id, sceneIndex)}
                            disabled={saving || scene.isMain}
                            className={`rounded border px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${
                              scene.isMain
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-neutral-300 bg-white text-neutral-600 hover:border-amber-400 hover:text-amber-700'
                            } disabled:opacity-60`}
                          >
                            {t('admin_project_weeks_set_main')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWeekId(week.id);
                              setEditingSceneIndex(sceneIndex);
                            }}
                            className="rounded-lg border border-black bg-black px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white hover:opacity-90"
                          >
                            {t('admin_project_weeks_edit_hotspots')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteScene(week.id, sceneIndex)
                            }
                            disabled={saving}
                            className="rounded border border-neutral-300 px-2 py-1 text-[10px] text-neutral-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                          >
                            {t('admin_project_weeks_remove')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
