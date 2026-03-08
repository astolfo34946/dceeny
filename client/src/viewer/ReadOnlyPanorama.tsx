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

interface HotspotConfig {
  pitch: number;
  yaw: number;
  targetSceneId: string;
  type: HotspotType;
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
  projectId: string;
  scenes: SceneConfig[];
  initialSceneId: string;
}

export function ReadOnlyPanorama({
  scenes,
  initialSceneId,
}: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState(initialSceneId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentSceneId(initialSceneId);
  }, [initialSceneId]);

  useEffect(() => {
    if (!containerRef.current || !scenes.length) return;

    const sceneMap: Record<string, SceneConfig> = Object.fromEntries(
      scenes.map((scene) => [scene.id, scene]),
    );

    const defaultScene = sceneMap[currentSceneId] ?? scenes[0];

    const viewer = window.pannellum.viewer(containerRef.current, {
      default: {
        firstScene: defaultScene.id,
        sceneFadeDuration: 800,
        autoLoad: true,
        ignoreGPanoXMP: true,
      },
      scenes: Object.fromEntries(
        scenes.map((scene) => [
          scene.id,
          {
            type: 'equirectangular',
            panorama: scene.imageUrl,
            title: scene.roomName,
            pitch: 0,
            yaw: 120,
            hfov: 100,
            hotSpots:
              scene.hotspots?.map((hotspot) => ({
                pitch: hotspot.pitch,
                yaw: hotspot.yaw,
                type: 'scene',
                text: '',
                sceneId: hotspot.targetSceneId,
              })) ?? [],
          },
        ]),
      ),
    });

    viewer.on('load', () => {
      setLoading(false);
    });

    viewer.on('scenechange', (nextSceneId: string) => {
      setCurrentSceneId(nextSceneId);
      setLoading(true);
    });

    viewerRef.current = viewer as never;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [scenes, currentSceneId]);

  const currentScene = scenes.find((s) => s.id === currentSceneId);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 animate-pulse rounded-full border border-white" />
            <p className="text-xs uppercase tracking-[0.18em] text-white/80">
              {t('readonly_loading_scene')}
            </p>
          </div>
        </div>
      )}

      {currentScene && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          {currentScene.roomName}
        </div>
      )}
    </div>
  );
}

