import { useEffect, useMemo, useRef, useState } from 'react';
import 'pannellum';
import 'pannellum/build/pannellum.css';
import { useTranslation } from 'react-i18next';
import { useIOSFullscreen } from '../customer/IOSViewerFullscreenWrapper';

declare global {
  interface Window {
    pannellum: any;
  }
}

type HotspotType = 'circle' | 'arrow';

interface HotspotConfig {
  pitch: number;
  yaw: number;
  targetSceneId: string;
  type: HotspotType;
  rotation?: number;
  label?: string;
}

interface SceneConfig {
  id: string;
  imageUrl: string;
  roomName: string;
  weekNumber: number;
  order: number;
  hotspots?: HotspotConfig[];
}

interface Props {
  projectId?: string;
  scenes: SceneConfig[];
  initialSceneId: string;
  /** Optional: called when the user switches scene (e.g. via hotspot) so parent can sync UI. */
  onSceneChange?: (sceneId: string) => void;
}

const MAX_CONCURRENT_PRELOADS_MOBILE = 2;
const MAX_CONCURRENT_PRELOADS_DESKTOP = 4;
const FIRST_SCENE_PRELOAD_TIMEOUT_MS = 8000;

function isProbablyMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const small = window.matchMedia?.('(max-width: 768px)')?.matches ?? false;
  return coarse || small;
}

/** Preload a single image by URL; browser cache will make Pannellum's load instant. */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

/** Preload first scene image with timeout so we don't block forever. */
function preloadFirstSceneWithTimeout(url: string): Promise<void> {
  return Promise.race([
    preloadImage(url),
    new Promise<void>((resolve) =>
      setTimeout(() => resolve(), FIRST_SCENE_PRELOAD_TIMEOUT_MS),
    ),
  ]);
}

/** VR overlay: stereo split view + gyroscope. Shown only on mobile. */
function VROverlay({
  panoramaUrl,
  initialYaw,
  initialPitch,
  initialHfov,
  onExit,
  onStateSync,
}: {
  panoramaUrl: string;
  initialYaw: number;
  initialPitch: number;
  initialHfov: number;
  onExit: () => void;
  onStateSync: (yaw: number, pitch: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const viewerLeftRef = useRef<any>(null);
  const viewerRightRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const leftEl = leftRef.current;
    const rightEl = rightRef.current;
    if (!container || !leftEl || !rightEl || !panoramaUrl) return;

    const sceneId = 'vr-scene';
    const baseConfig = {
      default: {
        firstScene: sceneId,
        sceneFadeDuration: 0,
        autoLoad: true,
        ignoreGPanoXMP: true,
        hfov: initialHfov,
      },
      scenes: {
        [sceneId]: {
          type: 'equirectangular' as const,
          panorama: panoramaUrl,
          pitch: initialPitch,
          yaw: initialYaw,
          hfov: initialHfov,
        },
      },
    };

    const vL = window.pannellum.viewer(leftEl, baseConfig);
    const vR = window.pannellum.viewer(rightEl, baseConfig);
    viewerLeftRef.current = vL;
    viewerRightRef.current = vR;

    const requestFs = () => {
      try {
        if (container.requestFullscreen) container.requestFullscreen();
      } catch {
        // ignore
      }
    };
    requestFs();

    // Orientation already requested on VR button click (iOS); start listener immediately
    const onOrientation = (e: DeviceOrientationEvent) => {
      const alpha = e.alpha != null ? e.alpha : orientationRef.current.alpha;
      const beta = e.beta != null ? e.beta : orientationRef.current.beta;
      const gamma = e.gamma != null ? e.gamma : orientationRef.current.gamma;
      orientationRef.current = { alpha, beta, gamma };
    };
    window.addEventListener('deviceorientation', onOrientation, true);

    const tick = () => {
      const { alpha, beta } = orientationRef.current;
      const yaw = typeof alpha === 'number' && !Number.isNaN(alpha) ? 360 - alpha : initialYaw;
      const pitch = typeof beta === 'number' && !Number.isNaN(beta) ? Math.max(-90, Math.min(90, -beta)) : initialPitch;
      try {
        if (typeof vL.setYaw === 'function') vL.setYaw(yaw);
        if (typeof vL.setPitch === 'function') vL.setPitch(pitch);
        if (typeof vR.setYaw === 'function') vR.setYaw(yaw);
        if (typeof vR.setPitch === 'function') vR.setPitch(pitch);
      } catch {
        /* ignore */
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true);
      cancelAnimationFrame(rafRef.current);
      try {
        vL.destroy();
      } catch {
        /* ignore */
      }
      try {
        vR.destroy();
      } catch {
        /* ignore */
      }
      viewerLeftRef.current = null;
      viewerRightRef.current = null;
      try {
        if (document.fullscreenElement === container) document.exitFullscreen?.();
      } catch {
        /* ignore */
      }
    };
  }, [panoramaUrl, initialYaw, initialPitch, initialHfov]);

  const handleExit = () => {
    const v = viewerLeftRef.current;
    if (v && typeof v.getYaw === 'function' && typeof v.getPitch === 'function') {
      onStateSync(v.getYaw(), v.getPitch());
    }
    onExit();
  };

  return (
    <div
      ref={containerRef}
      data-vr
      className="fixed inset-0 z-[100] flex h-full w-full flex-col bg-black"
      style={{ touchAction: 'none' }}
    >
      <div className="flex flex-1 overflow-hidden">
        <div ref={leftRef} className="h-full w-1/2" aria-label="Left eye" />
        <div ref={rightRef} className="h-full w-1/2" aria-label="Right eye" />
      </div>
      <button
        type="button"
        onClick={handleExit}
        className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/50 bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/80"
      >
        Exit VR
      </button>
    </div>
  );
}

export function ReadOnlyPanorama({
  scenes,
  initialSceneId,
  onSceneChange,
}: Props) {
  const { t } = useTranslation();
  const iosFullscreen = useIOSFullscreen();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any | null>(null);
  const preloadCacheRef = useRef<Set<string>>(new Set());
  const initialSceneIdRef = useRef(initialSceneId);
  const [, setCurrentSceneId] = useState(initialSceneId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [vrActive, setVrActive] = useState(false);
  const [vrInitial, setVrInitial] = useState<{ yaw: number; pitch: number; hfov: number; sceneId: string } | null>(null);
  const sceneMap = useMemo(
    () => Object.fromEntries(scenes.map((s) => [s.id, s])),
    [scenes],
  );

  useEffect(() => {
    setCurrentSceneId(initialSceneId);
  }, [initialSceneId]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!rootRef.current) {
        setIsFullscreen(false);
        return;
      }
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (iosFullscreen) {
      iosFullscreen.setIosFullscreenActive(!iosFullscreen.iosFullscreenActive);
      return;
    }
    if (!rootRef.current) return;
    try {
      if (document.fullscreenElement === rootRef.current) {
        if (document.exitFullscreen) await document.exitFullscreen();
      } else if (rootRef.current.requestFullscreen) {
        await rootRef.current.requestFullscreen();
      }
    } catch {
      // ignore
    }
  }

  const effectiveFullscreen = iosFullscreen ? iosFullscreen.iosFullscreenActive : isFullscreen;

  function closeVR() {
    setVrActive(false);
    setVrInitial(null);
  }

  function syncVRStateToViewer(yaw: number, pitch: number) {
    const v = viewerRef.current;
    if (!v || !vrInitial || typeof v.loadScene !== 'function') return;
    try {
      v.loadScene(vrInitial.sceneId, pitch, yaw, vrInitial.hfov);
    } catch {
      /* ignore */
    }
  }

  // Preload first scene image then create viewer so first paint is instant (image from cache).
  useEffect(() => {
    if (!containerRef.current || !scenes.length) return;

    setViewerReady(false);
    let cancelled = false;

    const sceneMap: Record<string, SceneConfig> = Object.fromEntries(
      scenes.map((scene) => [scene.id, scene]),
    );
    const defaultScene = sceneMap[initialSceneId] ?? scenes[0];
    const firstImageUrl = defaultScene?.imageUrl;

    function createViewer() {
      if (cancelled || !containerRef.current) return;
      const viewer = window.pannellum.viewer(containerRef.current, {
      default: {
        firstScene: defaultScene.id,
        sceneFadeDuration: 250,
        autoLoad: true,
        ignoreGPanoXMP: true,
        hfov: 75,
      },
      scenes: Object.fromEntries(
        scenes.map((scene) => [
          scene.id,
          {
            type: 'equirectangular',
            panorama: scene.imageUrl,
            title: '',
            pitch: 0,
            yaw: 120,
            hfov: 75,
            hotSpots:
              scene.hotspots?.map((hotspot) => {
                const targetRoom = sceneMap[hotspot.targetSceneId]?.roomName ?? 'Room';
                const text = (hotspot.label ?? '').trim() || targetRoom;
                const targetSceneId = hotspot.targetSceneId;
                return {
                  pitch: hotspot.pitch,
                  yaw: hotspot.yaw,
                  type: 'info' as const,
                  text,
                  cssClass: 'editor-hotspot-text',
                  clickHandlerFunc: (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const v = viewerRef.current;
                    if (v && typeof (v as { loadScene?: (id: string) => void }).loadScene === 'function') {
                      (v as { loadScene: (id: string) => void }).loadScene(targetSceneId);
                    }
                  },
                };
              }) ?? [],
          },
        ]),
      ),
    });

    viewer.on('load', () => {
      // After first (or any) scene load: preload all rooms reachable via arrow hotspots so next click is instant.
      const connectedIds = new Set<string>();
      scenes.forEach((s) => {
        s.hotspots?.forEach((h) => {
          if (h.targetSceneId && sceneMap[h.targetSceneId]) connectedIds.add(h.targetSceneId);
        });
      });

      const toPreload = Array.from(connectedIds).filter((id) => !preloadCacheRef.current.has(id));
      if (toPreload.length === 0) return;

      const mobile = isProbablyMobile();
      const concurrency = mobile ? MAX_CONCURRENT_PRELOADS_MOBILE : MAX_CONCURRENT_PRELOADS_DESKTOP;
      const run = () => {
        toPreload.forEach((id) => preloadCacheRef.current.add(id));
        let inFlight = 0;
        let index = 0;
        const next = () => {
          while (inFlight < concurrency && index < toPreload.length) {
            const id = toPreload[index++];
            const cfg = sceneMap[id];
            if (!cfg?.imageUrl) {
              next();
              continue;
            }
            inFlight++;
            preloadImage(cfg.imageUrl)
              .finally(() => {
                inFlight--;
                next();
              })
              .catch(() => {});
          }
        };
        next();
      };

      const ric = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback : null;
      if (ric) {
        ric(run, { timeout: 2000 });
      } else {
        setTimeout(run, 100);
      }
    });

    viewer.on('scenechange', (nextSceneId: string) => {
      setCurrentSceneId(nextSceneId);
      onSceneChange?.(nextSceneId);
    });

    viewerRef.current = viewer as never;
      setViewerReady(true);
    }

    if (firstImageUrl) {
      preloadFirstSceneWithTimeout(firstImageUrl).then(() => {
        createViewer();
      });
    } else {
      createViewer();
    }

    return () => {
      cancelled = true;
      const v = viewerRef.current;
      if (v) {
        try {
          v.destroy();
        } catch {
          /* ignore */
        }
        viewerRef.current = null;
      }
      setViewerReady(false);
    };
  }, [scenes]);

  // When parent changes initial scene (e.g. sidebar), switch via loadScene — do not recreate viewer.
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !scenes.length) return;
    if (initialSceneIdRef.current === initialSceneId) return;
    initialSceneIdRef.current = initialSceneId;
    const id = scenes.some((s) => s.id === initialSceneId) ? initialSceneId : scenes[0]?.id;
    if (!id) return;
    try {
      if (typeof v.loadScene === 'function') {
        const pitch = typeof v.getPitch === 'function' ? v.getPitch() : undefined;
        const yaw = typeof v.getYaw === 'function' ? v.getYaw() : undefined;
        const hfov = typeof v.getHfov === 'function' ? v.getHfov() : 75;
        if (typeof pitch === 'number' && typeof yaw === 'number') {
          v.loadScene(id, Math.max(-45, Math.min(45, pitch)), yaw, hfov);
        } else {
          v.loadScene(id);
        }
      }
      setCurrentSceneId(id);
    } catch {
      // ignore
    }
  }, [initialSceneId, scenes]);

  return (
    <div ref={rootRef} className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!viewerReady && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-neutral-900/30 transition-opacity duration-300"
          aria-hidden
        >
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/20" />
        </div>
      )}

      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="flex h-4 w-4 items-center justify-center">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
            {effectiveFullscreen ? (
              <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M9 5H5m0 0v4M5 5l4 4M15 5h4m0 0v4m0-4-4 4M9 19H5m0 0v-4m0 4 4-4M15 19h4m0 0v-4m0 4-4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </span>
        <span className="hidden sm:inline">
          {effectiveFullscreen ? t('common_exit_fullscreen') : t('common_fullscreen')}
        </span>
      </button>

      {vrActive && vrInitial && (() => {
        const scene = sceneMap[vrInitial.sceneId];
        const panoramaUrl = scene?.imageUrl ?? '';
        if (!panoramaUrl) return null;
        return (
          <VROverlay
            panoramaUrl={panoramaUrl}
            initialYaw={vrInitial.yaw}
            initialPitch={vrInitial.pitch}
            initialHfov={vrInitial.hfov}
            onExit={closeVR}
            onStateSync={syncVRStateToViewer}
          />
        );
      })()}
    </div>
  );
}

