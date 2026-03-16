import { useEffect, useRef, useState } from 'react';
import 'pannellum';
import 'pannellum/build/pannellum.css';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window {
    pannellum: any;
  }
}

type HotspotType = 'circle' | 'arrow';

export interface EditableHotspot {
  pitch: number;
  yaw: number;
  targetSceneId: string;
  type: HotspotType;
  rotation?: number;
  label?: string;
}

export interface EditableScene {
  id: string;
  imageUrl: string;
  roomName: string;
  order: number;
  hotspots?: EditableHotspot[];
}

interface EditorPanoramaProps {
  projectId: string;
  scene: EditableScene;
  scenes: EditableScene[];
  onChangeHotspots: (hotspots: EditableHotspot[] | undefined) => void;
}

interface DraftHotspot {
  pitch: number;
  yaw: number;
  targetSceneId: string;
  type: HotspotType;
  rotation?: number;
  label?: string;
}

export function EditorPanorama({
  scene,
  scenes,
  onChangeHotspots,
}: EditorPanoramaProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draftHotspots, setDraftHotspots] = useState<DraftHotspot[]>(
    scene.hotspots ?? [],
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setDraftHotspots(scene.hotspots ?? []);
    setSelectedIndex(null);
  }, [scene.id, scene.hotspots]);

  useEffect(() => {
    if (!containerRef.current) return;

    const v = window.pannellum.viewer(containerRef.current, {
      default: {
        firstScene: 'current',
        sceneFadeDuration: 400,
        autoLoad: true,
        ignoreGPanoXMP: true,
      },
      scenes: {
        current: {
          type: 'equirectangular',
          panorama: scene.imageUrl,
          pitch: 0,
          yaw: 120,
          hfov: 100,
          hotSpots: (draftHotspots ?? []).map((h, idx) => {
            const targetRoom = scenes.find((s) => s.id === h.targetSceneId)?.roomName ?? 'Room';
            const text = (h.label ?? '').trim() || targetRoom;
            return {
              pitch: h.pitch,
              yaw: h.yaw,
              text,
              type: 'scene' as const,
              sceneId: h.targetSceneId,
              cssClass: 'editor-hotspot-text',
              clickHandlerFunc: () => setSelectedIndex(idx),
            };
          }),
        },
      },
    });

    viewerRef.current = v as never;

    const container = containerRef.current;

    function handleClick(e: MouseEvent) {
      if (!viewerRef.current) return;
      // Add new hotspot at click position.
      const coords = (viewerRef.current as any).mouseEventToCoords(e) as [
        number,
        number,
      ];
      const [pitch, yaw] = coords;
      const next: DraftHotspot = {
        pitch,
        yaw,
        targetSceneId: scene.id,
        type: 'circle',
        rotation: 0,
      };
      setDraftHotspots((prev) => [...prev, next]);
      setSelectedIndex((prev) => (prev == null ? 0 : prev + 1));
    }

    function handleMouseDown(e: MouseEvent) {
      if (selectedIndex == null || !viewerRef.current) return;
      const target = e.target as HTMLElement;
      if (!target.classList.contains('editor-hotspot-text')) return;
      setIsDragging(true);
      e.preventDefault();
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isDragging || selectedIndex == null || !viewerRef.current) return;
      const coords = (viewerRef.current as any).mouseEventToCoords(e) as [
        number,
        number,
      ];
      const [pitch, yaw] = coords;
      setDraftHotspots((prev) =>
        prev.map((h, idx) =>
          idx === selectedIndex
            ? {
                ...h,
                pitch,
                yaw,
              }
            : h,
        ),
      );
    }

    function handleMouseUp() {
      if (!isDragging) return;
      setIsDragging(false);
      onChangeHotspots(draftHotspots);
    }

    container?.addEventListener('click', handleClick);
    container?.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container?.removeEventListener('click', handleClick);
      container?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      v.destroy();
      viewerRef.current = null;
    };
  }, [scene.imageUrl, draftHotspots, selectedIndex, isDragging, onChangeHotspots, scene.id]);

  function updateHotspot(idx: number, patch: Partial<DraftHotspot>) {
    setDraftHotspots((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)),
    );
  }

  function handleDelete(idx: number) {
    setDraftHotspots((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIndex(null);
  }

  function handleSaveAll() {
    onChangeHotspots(draftHotspots);
  }

  async function toggleFullscreen() {
    if (!rootRef.current) return;
    try {
      if (document.fullscreenElement === rootRef.current) {
        if (document.exitFullscreen) await document.exitFullscreen();
      } else if (rootRef.current.requestFullscreen) {
        await rootRef.current.requestFullscreen();
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(rootRef.current ? document.fullscreenElement === rootRef.current : false);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={rootRef}
        className="relative h-64 flex-1 w-full overflow-hidden rounded-b-md bg-black"
      >
        <div ref={containerRef} className="h-full w-full" />
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur-sm hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
            {isFullscreen ? (
              <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M9 5H5m0 0v4M5 5l4 4M15 5h4m0 0v4m0-4-4 4M9 19H5m0 0v-4m0 4 4-4M15 19h4m0 0v-4m0 4-4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          <span>{isFullscreen ? t('common_exit_fullscreen') : t('common_fullscreen')}</span>
        </button>
      </div>
      <div className="border-t border-neutral-800 bg-black/80 p-3 text-xs text-neutral-100">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-300">
              {t('editor_hotspots_title')}
            </p>
            <p className="text-[10px] text-neutral-500">
              {t('editor_hotspots_help')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            className="rounded-md border border-white bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition-colors duration-150 ease-smooth hover:bg-neutral-100"
          >
            {t('editor_save_hotspots')}
          </button>
        </div>
        {draftHotspots.length === 0 ? (
          <p className="text-[11px] text-neutral-500">
            {t('editor_hotspots_empty')}
          </p>
        ) : (
          <div className="smooth-scrollbar flex max-h-32 flex-col gap-1 overflow-y-auto pr-1">
            {draftHotspots.map((h, idx) => (
              <div
                key={`${h.targetSceneId}-${idx}`}
                className={`flex items-center gap-2 rounded-md border px-2 py-1 ${
                  idx === selectedIndex
                    ? 'border-white bg-white text-black'
                    : 'border-neutral-700 bg-black/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className="h-5 w-5 rounded-full border border-current text-[10px] font-semibold"
                >
                  {idx + 1}
                </button>
                <input
                  type="text"
                  value={h.label ?? ''}
                  onChange={(e) => updateHotspot(idx, { label: e.target.value })}
                  placeholder={scenes.find((s) => s.id === h.targetSceneId)?.roomName ?? 'Room'}
                  className="min-w-0 flex-1 rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-[10px] text-white placeholder:text-neutral-500"
                />
                <select
                  value={h.targetSceneId}
                  onChange={(e) =>
                    updateHotspot(idx, { targetSceneId: e.target.value })
                  }
                  className="min-w-[100px] rounded border border-neutral-600 bg-neutral-800 px-1 py-0.5 text-[10px] text-white"
                >
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.roomName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 hover:text-red-400"
                >
                  {t('common_delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

