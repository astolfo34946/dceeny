import { useEffect, useRef, useState } from 'react';
import 'pannellum';
import 'pannellum/build/pannellum.css';
import { useTranslation } from 'react-i18next';
import type { SceneHotspot, WeekScene } from '../types/app';

declare global {
  interface Window {
    pannellum: any;
  }
}

type HotspotType = 'circle' | 'arrow';

interface DraftHotspot {
  pitch: number;
  yaw: number;
  targetSceneIndex: number;
  type: HotspotType;
  rotation?: number;
}

interface SceneHotspotEditorProps {
  scene: WeekScene;
  sceneIndex: number;
  scenes: WeekScene[];
  onSave: (hotspots: SceneHotspot[]) => void;
  onCancel: () => void;
}

function toDraft(h: SceneHotspot): DraftHotspot {
  return {
    pitch: h.pitch,
    yaw: h.yaw,
    targetSceneIndex: h.targetSceneIndex ?? 0,
    type: h.type,
    rotation: h.rotation ?? 0,
  };
}

function toSceneHotspot(h: DraftHotspot): SceneHotspot {
  return {
    pitch: h.pitch,
    yaw: h.yaw,
    targetSceneIndex: h.targetSceneIndex,
    type: h.type,
    rotation: h.rotation,
  };
}

export function SceneHotspotEditor({
  scene,
  sceneIndex,
  scenes,
  onSave,
  onCancel,
}: SceneHotspotEditorProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draftHotspots, setDraftHotspots] = useState<DraftHotspot[]>(
    (scene.hotspots ?? []).map(toDraft)
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setDraftHotspots((scene.hotspots ?? []).map(toDraft));
    setSelectedIndex(null);
  }, [scene.imageUrl, scene.hotspots]);

  useEffect(() => {
    if (!containerRef.current || !scene.imageUrl) return;

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
            const rotation = h.rotation ?? 0;
            const spot: Record<string, unknown> = {
              pitch: h.pitch,
              yaw: h.yaw,
              text: '',
              type: h.type === 'arrow' ? 'scene' : 'info',
              sceneId: h.type === 'arrow' ? String(h.targetSceneIndex) : undefined,
              rotation,
              cssClass:
                h.type === 'arrow'
                  ? 'editor-hotspot-arrow'
                  : 'editor-hotspot-circle',
              clickHandlerFunc: () => setSelectedIndex(idx),
            };
            if (h.type === 'arrow') {
              spot.createTooltipFunc = (div: HTMLElement, args: { rotation?: number }) => {
                if (args && typeof args.rotation === 'number') {
                  div.style.setProperty('--arrow-rotation', String(args.rotation) + 'deg');
                }
              };
              spot.createTooltipArgs = { rotation };
            }
            return spot;
          }),
        },
      },
    });

    viewerRef.current = v;
    const container = containerRef.current;

    function handleClick(e: MouseEvent) {
      if (!viewerRef.current) return;
      const coords = viewerRef.current.mouseEventToCoords(e) as [number, number];
      const [pitch, yaw] = coords;
      setDraftHotspots((prev) => [
        ...prev,
        { pitch, yaw, targetSceneIndex: sceneIndex, type: 'circle', rotation: 0 },
      ]);
      setSelectedIndex((prev) => (prev == null ? 0 : prev + 1));
    }

    function handleMouseDown(e: MouseEvent) {
      if (selectedIndex == null || !viewerRef.current) return;
      const target = e.target as HTMLElement;
      if (!target.classList.contains('editor-hotspot-circle')) return;
      setIsDragging(true);
      e.preventDefault();
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isDragging || selectedIndex == null || !viewerRef.current) return;
      const coords = viewerRef.current.mouseEventToCoords(e) as [number, number];
      const [pitch, yaw] = coords;
      setDraftHotspots((prev) =>
        prev.map((h, idx) =>
          idx === selectedIndex ? { ...h, pitch, yaw } : h
        )
      );
    }

    function handleMouseUp() {
      if (!isDragging) return;
      setIsDragging(false);
    }

    container.addEventListener('click', handleClick);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      v.destroy();
      viewerRef.current = null;
    };
  }, [
    scene.imageUrl,
    draftHotspots,
    selectedIndex,
    isDragging,
    sceneIndex,
  ]);

  function updateHotspot(idx: number, patch: Partial<DraftHotspot>) {
    setDraftHotspots((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, ...patch } : h))
    );
  }

  function handleDelete(idx: number) {
    setDraftHotspots((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIndex(null);
  }

  function handleSaveAll() {
    onSave(draftHotspots.map(toSceneHotspot));
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
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-lg">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h3 className="font-semibold text-black">
          {t('hotspot_editor_title', { room: scene.roomName })}
        </h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          {t('hotspot_editor_help')}
        </p>
      </div>
      <div className="flex flex-col md:flex-row">
        <div
          ref={rootRef}
          className="relative h-80 min-h-[280px] flex-1 bg-black md:h-96"
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
        <div className="w-full border-t border-neutral-200 bg-neutral-50 p-4 md:w-80 md:border-t-0 md:border-l">
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={handleSaveAll}
              className="rounded-lg border border-black bg-black px-3 py-2 text-xs font-medium uppercase tracking-wider text-white hover:opacity-90"
            >
              {t('hotspot_editor_save')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            >
              {t('common_cancel')}
            </button>
          </div>
          {draftHotspots.length === 0 ? (
            <p className="text-xs text-neutral-500">
              {t('hotspot_editor_empty')}
            </p>
          ) : (
            <div className="smooth-scrollbar max-h-48 space-y-2 overflow-y-auto pr-1">
              {draftHotspots.map((h, idx) => (
                <div
                  key={idx}
                  className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-2 ${
                    idx === selectedIndex
                      ? 'border-black bg-white'
                      : 'border-neutral-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className="h-6 w-6 shrink-0 rounded-full border border-current text-[10px] font-semibold"
                  >
                    {idx + 1}
                  </button>
                  <select
                    value={h.type}
                    onChange={(e) =>
                      updateHotspot(idx, { type: e.target.value as HotspotType })
                    }
                    className="rounded border border-neutral-300 px-2 py-1 text-xs"
                  >
                    <option value="circle">{t('hotspot_type_circle')}</option>
                    <option value="arrow">{t('hotspot_type_arrow')}</option>
                  </select>
                  {h.type === 'arrow' && (
                    <select
                      value={
                        (() => {
                          const r = h.rotation ?? 0;
                          const normalized = ((Math.round(r / 30) * 30) % 360 + 360) % 360;
                          return normalized === 0 ? 12 : normalized / 30;
                        })()
                      }
                      onChange={(e) => {
                        const clock = Number(e.target.value);
                        updateHotspot(idx, {
                          rotation: clock === 12 ? 0 : clock * 30,
                        });
                      }}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      title={t('hotspot_arrow_direction_clock')}
                    >
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => (
                        <option key={hour} value={hour}>
                          {hour} {t('hotspot_clock_oclock')}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    value={h.targetSceneIndex}
                    onChange={(e) =>
                      updateHotspot(idx, {
                        targetSceneIndex: parseInt(e.target.value, 10),
                      })
                    }
                    className="min-w-[120px] rounded border border-neutral-300 px-2 py-1 text-xs"
                  >
                    {scenes.map((s, i) => (
                      <option key={i} value={i}>
                        {s.roomName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="text-xs text-neutral-500 hover:text-red-600"
                  >
                    {t('common_delete')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
