import { useEffect, useMemo, useRef, useState } from 'react';
import 'pannellum';
import 'pannellum/build/pannellum.css';
import { useTranslation } from 'react-i18next';
import type { WeekScene } from '../types/app';

interface WeekPanoramaViewerProps {
  scenes: WeekScene[];
  initialSceneIndex?: number;
  /** Called when the displayed scene changes (e.g. hotspot click) so parent can sync room list */
  onSceneIndexChange?: (index: number) => void;
}

type CacheEntry =
  | { status: 'loading'; img: HTMLImageElement; promise: Promise<void> }
  | { status: 'loaded'; img: HTMLImageElement }
  | { status: 'error'; img: HTMLImageElement; error: unknown };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function isProbablyMobile() {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const small = window.matchMedia?.('(max-width: 768px)')?.matches ?? false;
  return coarse || small;
}

export function WeekPanoramaViewer({
  scenes,
  initialSceneIndex = 0,
  onSceneIndexChange,
}: WeekPanoramaViewerProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const pendingSceneIdRef = useRef<string | null>(null);
  const spinnerTimerRef = useRef<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(initialSceneIndex);
  const [loading, setLoading] = useState(true);
  const [transitionOpacity, setTransitionOpacity] = useState(1);
  const [showSpinner, setShowSpinner] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mobile = useMemo(() => isProbablyMobile(), []);
  const sceneId = (i: number) => String(i);

  useEffect(() => {
    setCurrentIndex(Math.min(initialSceneIndex, Math.max(0, scenes.length - 1)));
  }, [initialSceneIndex, scenes.length]);

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

  // When parent changes selected room (e.g. sidebar click), switch the panorama.
  useEffect(() => {
    if (!viewerRef.current || !scenes.length) return;
    const idx = Math.max(0, Math.min(initialSceneIndex, scenes.length - 1));
    const id = sceneId(idx);
    try {
      (viewerRef.current as any).loadScene?.(id);
      setCurrentIndex(idx);
    } catch {
      // ignore
    }
  }, [initialSceneIndex, scenes.length]);

  function ensurePreloaded(idx: number) {
    const id = sceneId(idx);
    const url = scenes[idx]?.imageUrl;
    if (!url) return Promise.reject(new Error('Missing imageUrl'));

    const existing = cacheRef.current.get(id);
    if (existing?.status === 'loaded') return Promise.resolve();
    if (existing?.status === 'loading') return existing.promise;

    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';

    const promise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
    });
    cacheRef.current.set(id, { status: 'loading', img, promise });
    img.src = url;

    promise
      .then(() => {
        cacheRef.current.set(id, { status: 'loaded', img });
      })
      .catch((error) => {
        cacheRef.current.set(id, { status: 'error', img, error });
      });

    return promise;
  }

  function preloadConnected(fromIdx: number) {
    const hs = scenes[fromIdx]?.hotspots ?? [];
    const targets = Array.from(
      new Set(
        hs
          .map((h) => h.targetSceneIndex)
          .filter((t): t is number => typeof t === 'number' && t >= 0 && t < scenes.length),
      ),
    );

    // Priority: connected targets first, then everything else (desktop only).
    const connected = targets.filter((t) => t !== fromIdx);

    // Limit concurrency to keep UI smooth.
    const concurrency = mobile ? 1 : 3;
    let active = 0;
    const queue = [...connected];

    const runNext = () => {
      while (active < concurrency && queue.length) {
        const idx = queue.shift()!;
        active++;
        ensurePreloaded(idx).finally(() => {
          active--;
          runNext();
        });
      }
    };
    runNext();

    if (!mobile) {
      const remaining = scenes
        .map((_, i) => i)
        .filter((i) => i !== fromIdx && !connected.includes(i));

      const idlePreload = () => {
        let k = 0;
        const step = () => {
          if (k >= remaining.length) return;
          const idx = remaining[k++];
          ensurePreloaded(idx).finally(() => {
            // keep a tiny gap between preloads
            setTimeout(step, 40);
          });
        };
        step();
      };

      const ric = (globalThis as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout: number }) => void)
        | undefined;
      if (ric) {
        ric(idlePreload, { timeout: 1500 });
      } else {
        setTimeout(idlePreload, 300);
      }
    }
  }

  function navigateTo(targetIdx: number) {
    if (!viewerRef.current) return;
    if (targetIdx < 0 || targetIdx >= scenes.length) return;
    if (targetIdx === currentIndex) return;

    const nextId = sceneId(targetIdx);
    pendingSceneIdRef.current = nextId;

    // Subtle fade (no black/white flashes).
    setTransitionOpacity(0.85);
    setErrorText(null);

    // Show spinner only if it actually takes time (avoid blinking loaders).
    if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
    spinnerTimerRef.current = setTimeout(() => {
      const entry = cacheRef.current.get(nextId);
      if (entry?.status !== 'loaded') setShowSpinner(true);
    }, 250);

    // Preserve camera direction as much as possible.
    const v = viewerRef.current as any;
    const yaw = typeof v.getYaw === 'function' ? v.getYaw() : undefined;
    const pitch = typeof v.getPitch === 'function' ? v.getPitch() : undefined;
    const hfov = typeof v.getHfov === 'function' ? v.getHfov() : undefined;
    const safePitch = typeof pitch === 'number' ? clamp(pitch, -45, 45) : undefined;

    try {
      if (typeof v.loadScene === 'function') {
        if (
          typeof safePitch === 'number' &&
          typeof yaw === 'number' &&
          typeof hfov === 'number'
        ) {
          v.loadScene(nextId, safePitch, yaw, hfov);
        } else if (typeof safePitch === 'number' && typeof yaw === 'number') {
          v.loadScene(nextId, safePitch, yaw);
        } else {
          v.loadScene(nextId);
        }
      }
    } catch {
      // If anything goes wrong, fall back to letting Pannellum load normally.
      try {
        v.loadScene?.(nextId);
      } catch {
        // ignore
      }
    }

    // If already cached, fade back immediately (no waiting / no dim stuck).
    const cachedNow = cacheRef.current.get(nextId)?.status === 'loaded';
    if (cachedNow) {
      setShowSpinner(false);
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
      requestAnimationFrame(() => setTransitionOpacity(1));
    } else {
      // Warm browser cache in background (do not block UI).
      ensurePreloaded(targetIdx).catch(() => undefined);
    }
  }

  async function toggleFullscreen() {
    if (!rootRef.current) return;

    try {
      if (document.fullscreenElement === rootRef.current) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } else if (rootRef.current.requestFullscreen) {
        await rootRef.current.requestFullscreen();
      }
    } catch {
      // ignore fullscreen errors – we keep viewer usable even if FS fails
    }
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !scenes.length) return;

    // Clear previous cache when leaving/re-entering a project/week.
    cacheRef.current.clear();
    setLoading(true);
    setShowSpinner(false);
    setTransitionOpacity(1);
    setErrorText(null);
    pendingSceneIdRef.current = null;

    const defaultIdx = Math.min(currentIndex, scenes.length - 1);
    const defaultId = sceneId(defaultIdx);

    // Start preloading ONLY the visible scene now.
    ensurePreloaded(defaultIdx).catch(() => undefined);

    // Defer init so mobile has done layout (avoids 0x0 canvas → black screen).
    let viewer: any;
    let rafId1 = 0;
    let rafId2 = 0;
    let resizeObserver: ResizeObserver | null = null;
    let sizeWaitObserver: ResizeObserver | null = null;
    let initTimeoutId = 0;

    function runInit() {
      if (!containerRef.current) return;
      const el = containerRef.current;
      // On mobile, container can still report 0x0; skip init until we have dimensions.
      const w = el.offsetWidth || el.clientWidth;
      const h = el.offsetHeight || el.clientHeight;
      if (w < 10 || h < 10) {
        if (typeof ResizeObserver !== 'undefined') {
          sizeWaitObserver = new ResizeObserver(() => {
            const w2 = el.offsetWidth || el.clientWidth;
            const h2 = el.offsetHeight || el.clientHeight;
            if (w2 >= 10 && h2 >= 10 && sizeWaitObserver) {
              sizeWaitObserver.disconnect();
              sizeWaitObserver = null;
              runInit();
            }
          });
          sizeWaitObserver.observe(el);
          return;
        }
        initTimeoutId = window.setTimeout(runInit, 100);
        return;
      }
      try {
        viewer = (window as any).pannellum?.viewer?.(containerRef.current, {
          default: {
            firstScene: defaultId,
            sceneFadeDuration: 0,
            autoLoad: true,
            showControls: true,
            showZoomCtrl: false,
            ignoreGPanoXMP: true,
          },
          scenes: Object.fromEntries(
            scenes.map((scene, i) => [
              sceneId(i),
              {
                type: 'equirectangular',
                panorama: scene.imageUrl,
                title: scene.roomName,
                ignoreGPanoXMP: true,
                hotSpots:
                scene.hotspots?.map((h) => {
                  const target =
                    typeof h.targetSceneIndex === 'number' ? h.targetSceneIndex : 0;
                  const cssClass =
                    h.type === 'arrow' ? 'editor-hotspot-arrow' : 'editor-hotspot-circle';
                  const rotation = h.rotation ?? 0;
                  const spot: Record<string, unknown> = {
                    pitch: h.pitch,
                    yaw: h.yaw,
                    type: 'info',
                    text: '',
                    cssClass,
                    clickHandlerFunc: () => navigateTo(target),
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
                }) ?? [],
              },
            ]),
          ),
        });
      } catch (err) {
        setLoading(false);
        setShowSpinner(false);
        setTransitionOpacity(1);
        setErrorText(t('viewer_unavailable'));
        return;
      }

      viewerRef.current = viewer;

      viewer.on('load', () => {
        setLoading(false);
        setShowSpinner(false);
        setTransitionOpacity(1);
        if (spinnerTimerRef.current) {
          clearTimeout(spinnerTimerRef.current);
          spinnerTimerRef.current = null;
        }
        // Fix canvas size on mobile after load (and when container was 0x0 at init).
        if (typeof viewer.resize === 'function') viewer.resize();
        const activeId = pendingSceneIdRef.current;
        if (activeId) {
          const idx = parseInt(activeId, 10);
          if (!Number.isNaN(idx)) {
            setCurrentIndex(idx);
            onSceneIndexChange?.(idx);
          }
          pendingSceneIdRef.current = null;
        }
        const idx =
          activeId && !Number.isNaN(parseInt(activeId, 10))
            ? parseInt(activeId, 10)
            : currentIndex;
        preloadConnected(idx);
      });

      viewer.on('error', (msg: string) => {
        setLoading(false);
        setShowSpinner(false);
        setTransitionOpacity(1);
        setErrorText(typeof msg === 'string' ? msg : t('viewer_failed_to_load_scene_fallback'));
      });

      viewer.on('scenechange', (nextId: string) => {
        const idx = parseInt(nextId, 10);
        if (!Number.isNaN(idx)) {
          setCurrentIndex(idx);
          onSceneIndexChange?.(idx);
        }
      });

      // Resize when container size changes (orientation, expand, etc.) so mobile stays correct.
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (viewerRef.current && typeof viewerRef.current.resize === 'function') {
            viewerRef.current.resize();
          }
        });
        resizeObserver.observe(containerRef.current);
      }
    }

    // Wait for layout so container has real dimensions on mobile (avoids black 0x0 canvas).
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        runInit();
      });
    });

    return () => {
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
      if (initTimeoutId) clearTimeout(initTimeoutId);
      if (rafId1) cancelAnimationFrame(rafId1);
      if (rafId2) cancelAnimationFrame(rafId2);
      sizeWaitObserver?.disconnect();
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (viewer && typeof viewer.destroy === 'function') viewer.destroy();
      viewerRef.current = null;
      cacheRef.current.clear();
    };
  }, [scenes, t]);

  const currentScene = scenes[currentIndex];

  return (
    <div ref={rootRef} className="relative h-full w-full bg-black">
      {currentScene?.imageUrl && (
        <img
          src={currentScene.imageUrl}
          alt={currentScene.roomName}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
        />
      )}
      <div
        className="h-full w-full"
        style={{
          opacity: transitionOpacity,
          transition: 'opacity 220ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          willChange: 'opacity',
          backgroundColor: 'black',
        }}
      >
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {(loading || showSpinner) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="h-8 w-8 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
        </div>
      )}

      {errorText && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center">
          <div className="max-w-md rounded-2xl border border-white/10 bg-black/50 p-6 text-white">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              {t('viewer_scene_failed_title')}
            </p>
            <p className="mt-2 text-sm text-white/80">{errorText}</p>
          </div>
        </div>
      )}

      {currentScene && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          {currentScene.roomName}
        </div>
      )}

      {/* Custom fullscreen button (bigger + more reliable than default Pannellum icon) */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="flex h-4 w-4 items-center justify-center">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {isFullscreen ? (
              <path
                d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M9 5H5m0 0v4M5 5l4 4M15 5h4m0 0v4m0-4-4 4M9 19H5m0 0v-4m0 4 4-4M15 19h4m0 0v-4m0 4-4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </span>
        <span className="hidden sm:inline">
          {isFullscreen ? t('common_exit_fullscreen') : t('common_fullscreen')}
        </span>
      </button>
    </div>
  );
}
