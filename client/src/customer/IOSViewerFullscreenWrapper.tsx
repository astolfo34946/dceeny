import { createContext, useContext, useEffect, useState } from 'react';

/** Detect iPhone, iPad, iPod (user agent). iPad 13+ may report as Mac; optional touch check. */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

export interface IOSFullscreenContextValue {
  iosFullscreenActive: boolean;
  setIosFullscreenActive: (active: boolean) => void;
}

const IOSFullscreenContext = createContext<IOSFullscreenContextValue | null>(null);

export function useIOSFullscreen() {
  return useContext(IOSFullscreenContext);
}

interface Props {
  children: React.ReactNode;
  /** When true, this route is a viewer (360 or 3D) and can use fullscreen on iOS. */
  isViewerRoute: boolean;
}

export function IOSViewerFullscreenWrapper({ children, isViewerRoute }: Props) {
  const [iosFullscreenActive, setIosFullscreenActive] = useState(false);
  const isIOSDevice = isIOS();
  const active = isViewerRoute && isIOSDevice && iosFullscreenActive;

  useEffect(() => {
    if (!active) return;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.inset = '0';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.inset = '';
      document.body.style.width = '';
    };
  }, [active]);

  if (!isViewerRoute || !isIOSDevice) return <>{children}</>;

  const contextValue: IOSFullscreenContextValue = {
    iosFullscreenActive,
    setIosFullscreenActive,
  };

  return (
    <IOSFullscreenContext.Provider value={contextValue}>
      {active ? (
    <div
      className="ios-viewer-fullscreen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 99999,
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {children}
      </div>
      <style>{`
        .ios-viewer-fullscreen * { visibility: hidden; pointer-events: none; }
        .ios-viewer-fullscreen [data-viewer-root],
        .ios-viewer-fullscreen [data-viewer-root] * { visibility: visible; pointer-events: auto; }
        .ios-viewer-fullscreen [data-viewer-root] {
          position: fixed !important;
          top: env(safe-area-inset-top) !important;
          left: env(safe-area-inset-left) !important;
          right: env(safe-area-inset-right) !important;
          bottom: env(safe-area-inset-bottom) !important;
          width: auto !important;
          height: auto !important;
          min-width: 100% !important;
          min-height: 100% !important;
          border-radius: 0 !important;
          z-index: 1;
        }
      `}</style>
    </div>
      ) : (
        <>{children}</>
      )}
    </IOSFullscreenContext.Provider>
  );
}
