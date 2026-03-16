import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { PROJECTS_3D_COLLECTION } from '../lib/useCustomerProject';
import type { ProjectGalleryImage } from '../types/app';

type GalleryItem = ProjectGalleryImage & { id: string };

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function uploadToCloudinary(projectId: string, file: File, onProgress?: (p: number) => void) {
  const signUrl = import.meta.env.VITE_CLOUDINARY_SIGN_URL as string | undefined;
  if (!signUrl) throw new Error('VITE_CLOUDINARY_SIGN_URL is not set');
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const resSign = await fetch(signUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } : {}),
    },
    body: JSON.stringify({ projectId, fileName: file.name }),
  });
  if (!resSign.ok) throw new Error(`Sign request failed: ${resSign.statusText}`);

  const resJson = (await resSign.json()) as {
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder?: string;
  };

  const { timestamp, signature, apiKey, cloudName } = resJson;
  // Use the exact folder the backend signed (no subFolder) to avoid 401.
  const folder = resJson.folder ?? `projects/${projectId}`;

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', folder);

  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { secure_url: string };
          resolve(json.secure_url);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error(xhr.statusText));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(form);
  });
}

export function Admin3DProjectGallery() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState<string>('');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getDoc(doc(db, PROJECTS_3D_COLLECTION, projectId)).then((snap) => {
      const data = (snap.data() ?? {}) as Record<string, unknown>;
      setProjectName((data.name as string) ?? '');
      const g = (data.gallery as ProjectGalleryImage[] | undefined) ?? [];
      setItems(
        g.map((it) => ({
          id: uid(),
          url: it.url,
          caption: it.caption,
          createdAt: it.createdAt,
        })),
      );
      setLoading(false);
    });
  }, [projectId]);

  const canUpload = !!projectId && !uploading && !saving;
  const projectRef = useMemo(
    () => (projectId ? doc(db, PROJECTS_3D_COLLECTION, projectId) : null),
    [projectId],
  );

  async function persist(next: GalleryItem[]) {
    if (!projectRef) return;
    setSaving(true);
    try {
      const payload = next.map(({ url, caption, createdAt }) => ({ url, caption, createdAt }));
      await updateDoc(projectRef, { gallery: payload });
      setItems(next);
    } finally {
      setSaving(false);
    }
  }

  async function handlePickFiles(files: FileList | null) {
    if (!files || !projectId || !projectRef) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;

    setUploading(true);
    setUploadProgress(1);
    try {
      const createdAt = new Date().toISOString();
      const uploaded: GalleryItem[] = [];
      // Upload sequentially to avoid saturating mobile / Cloudinary and keep UI responsive.
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        setUploadProgress(Math.round(((i + 0.05) / list.length) * 100));
        const url = await uploadToCloudinary(projectId, f, (p) => {
          // Blend per-file progress into overall progress.
          const base = i / list.length;
          const blended = Math.round((base + (p / 100) * (1 / list.length)) * 100);
          setUploadProgress(Math.max(1, Math.min(99, blended)));
        });
        uploaded.push({ id: uid(), url, caption: '', createdAt });
      }
      setUploadProgress(100);
      await persist([...items, ...uploaded]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    const tmp = next[index];
    next[index] = next[to];
    next[to] = tmp;
    persist(next).catch(() => undefined);
  }

  function remove(index: number) {
    const next = items.filter((_, i) => i !== index);
    persist(next).catch(() => undefined);
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
          {projectName || t('admin_3d_title')} · {t('admin_gallery_title', 'Gallery')}
        </h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-black">
              {t('admin_gallery_upload_label', 'Upload normal photos')}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {t('admin_gallery_upload_help', 'These images appear under the 3D viewer (not 360 panoramas).')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              disabled={!canUpload}
              onChange={(e) => handlePickFiles(e.target.files).catch(() => undefined)}
              className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border file:border-black file:bg-black file:px-3 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-wider file:text-white hover:file:opacity-90 disabled:opacity-60"
            />
          </div>
        </div>

        {uploading && (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
          {t('admin_gallery_list_title', 'Images')}
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            {t('admin_gallery_empty', 'No gallery images yet.')}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((it, index) => (
              <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-14 w-24 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  <img
                    src={it.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={it.caption ?? ''}
                    onChange={(e) => {
                      const next = items.map((x, i) => (i === index ? { ...x, caption: e.target.value } : x));
                      setItems(next);
                    }}
                    onBlur={() => persist(items).catch(() => undefined)}
                    placeholder={t('admin_gallery_caption_placeholder', 'Optional caption')}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black outline-none focus:border-black"
                    disabled={saving || uploading}
                  />
                  <p className="mt-1 text-xs text-neutral-400 truncate">{it.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={saving || uploading || index === 0}
                    className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium uppercase tracking-wider text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-40"
                    title={t('admin_gallery_move_up', 'Move up')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={saving || uploading || index === items.length - 1}
                    className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium uppercase tracking-wider text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-40"
                    title={t('admin_gallery_move_down', 'Move down')}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={saving || uploading}
                    className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium uppercase tracking-wider text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-40"
                    title={t('admin_gallery_delete', 'Delete')}
                  >
                    {t('admin_projects_delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

