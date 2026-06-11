import React, { useRef, useState, useEffect, useCallback } from "react";
import type { FacingMode, MediaItem, Screen } from "../types.ts";
import Gallery from "../components/Gallery.tsx";
import FrameStudio from "../components/FrameStudio.tsx";
import FilterSelector, { FILTERS } from "../components/FilterSelector.tsx";
import FaceBeautyPanel from "../components/FaceBeautyPanel.tsx";
import type { CameraFilter } from "../types.ts";
import { FaceBeautyEngine, DEFAULT_BEAUTY } from "../Facebeautyengine.ts";
import type { BeautyParams } from "../Facebeautyengine.ts";
import "./CameraScreen.css";

interface CameraScreenProps {
  onCapture?: (item: MediaItem) => void;
  onNavigate?: (screen: Screen) => void;
  onLogout?: () => void;
}

const CompositionIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="1.5" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);

const BeautyIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M6 20v-1a6 6 0 0112 0v1" />
    <path d="M12 2v2M12 14v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41" />
  </svg>
);

const FilterIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const FlipIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 7L16 3L12 7" />
    <path d="M16 3V15C16 16.1046 15.1046 17 14 17H4" />
    <path d="M4 17L8 21L12 17" />
    <path d="M8 21V9C8 7.89543 8.89543 7 10 7H20" />
  </svg>
);

const FrameIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="7" y="7" width="4" height="4" rx="0.5" />
    <rect x="13" y="7" width="4" height="4" rx="0.5" />
    <rect x="7" y="13" width="4" height="4" rx="0.5" />
    <rect x="13" y="13" width="4" height="4" rx="0.5" />
  </svg>
);

const CameraScreen: React.FC<CameraScreenProps> = ({ onCapture, onLogout }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beautyCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<FaceBeautyEngine | null>(null);

  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [captures, setCaptures] = useState<MediaItem[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [showFrameStudio, setShowFrameStudio] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [showZoomUI, setShowZoomUI] = useState(false);
  const zoomRef = useRef(1);
  const zoomHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);
  const isPinching = useRef(false);

  const [activeFilter, setActiveFilter] = useState<CameraFilter>(FILTERS[0]);
  const [showFilter, setShowFilter] = useState(false);
  const activeFilterRef = useRef<CameraFilter>(FILTERS[0]);

  const [beautyParams, setBeautyParams] = useState<BeautyParams>({
    ...DEFAULT_BEAUTY,
  });
  const [showBeauty, setShowBeauty] = useState(false);
  const [beautyLoading, setBeautyLoading] = useState(false);
  const beautyParamsRef = useRef<BeautyParams>({ ...DEFAULT_BEAUTY });
  const beautyOn = Object.values(beautyParams).some((v) => v !== 0);
  const anyBeauty = beautyOn;
  const panelOpen = showBeauty || showFilter;

  useEffect(() => {
    beautyParamsRef.current = beautyParams;
    engineRef.current?.updateParams(beautyParams);
  }, [beautyParams]);

  const handleFilterChange = useCallback((filter: CameraFilter) => {
    activeFilterRef.current = filter;
    setActiveFilter(filter);
    const video = videoRef.current;
    if (video && !beautyParamsRef.current) return;
    if (video) {
      video.style.filter = filter.css === "none" ? "" : filter.css;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (beautyOn) {
      video.style.filter = "";
    } else {
      const f = activeFilterRef.current;
      video.style.filter = f.css === "none" ? "" : f.css;
    }
  }, [beautyOn]);

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          void videoRef.current!.play();
          setCameraReady(true);
          const f = activeFilterRef.current;
          if (videoRef.current) {
            videoRef.current.style.filter = f.css === "none" ? "" : f.css;
          }
        };
      }
      setError(null);
    } catch {
      setError("카메라 접근 권한을 허용해 주세요.");
    }
  }, [facingMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void startCamera();
    }, 0);
    return () => {
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [startCamera]);

  const applyZoom = useCallback(
    async (newZoom: number) => {
      const clamped = Math.round(Math.max(0.5, Math.min(5, newZoom)) * 10) / 10;
      zoomRef.current = clamped;
      setZoom(clamped);
      setShowZoomUI(true);
      if (zoomHideTimer.current) clearTimeout(zoomHideTimer.current);
      zoomHideTimer.current = setTimeout(() => setShowZoomUI(false), 1800);
      try {
        const track = streamRef.current?.getVideoTracks()[0];
        if (track) {
          const capabilities =
            track.getCapabilities() as MediaTrackCapabilities & {
              zoom?: { min: number; max: number };
            };
          if (capabilities.zoom) {
            const minZ = capabilities.zoom.min;
            const maxZ = capabilities.zoom.max;
            const mappedZoom = minZ + ((clamped - 0.5) / 4.5) * (maxZ - minZ);
            await track.applyConstraints({
              advanced: [
                {
                  zoom: Math.max(minZ, Math.min(maxZ, mappedZoom)),
                } as MediaTrackConstraintSet,
              ],
            });
          } else {
            if (videoRef.current) {
              const scale = clamped < 1 ? 1 : clamped;
              const mirror = facingMode === "user" ? "scaleX(-1)" : "";
              videoRef.current.style.transform =
                `scale(${scale}) ${mirror}`.trim();
            }
          }
        }
      } catch {
        /* */
      }
    },
    [facingMode],
  );

  const getTouchDist = (touches: React.TouchList | TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleVideoTouchStart = useCallback(
    (e: React.TouchEvent<HTMLVideoElement>) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching.current = true;
        pinchStartDist.current = getTouchDist(e.touches);
        pinchStartZoom.current = zoomRef.current;
      }
    },
    [],
  );

  const handleVideoTouchMove = useCallback(
    (e: React.TouchEvent<HTMLVideoElement>) => {
      if (!isPinching.current || e.touches.length !== 2) return;
      e.preventDefault();
      void applyZoom(
        pinchStartZoom.current *
          (getTouchDist(e.touches) / pinchStartDist.current),
      );
    },
    [applyZoom],
  );

  const handleVideoTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLVideoElement>) => {
      if (e.touches.length < 2) isPinching.current = false;
    },
    [],
  );

  const initBeauty = useCallback(async () => {
    if (engineRef.current) return;
    const video = videoRef.current;
    const canvas = beautyCanvasRef.current;
    if (!video || !canvas) return;
    setBeautyLoading(true);
    try {
      const engine = new FaceBeautyEngine(
        video,
        canvas,
        beautyParamsRef.current,
        () => {
          setBeautyLoading(false);
          engine.start();
        },
      );
      engineRef.current = engine;
      await engine.init();
    } catch {
      setBeautyLoading(false);
      setError("리터치 기능을 불러올 수 없습니다.");
    }
  }, []);

  const takePhoto = () => {
    const f = activeFilterRef.current;
    const hasFilter = f.css !== "none" && f.id !== "normal";

    if (beautyOn && beautyCanvasRef.current) {
      const bc = beautyCanvasRef.current;
      const canvas = captureCanvasRef.current;
      if (!canvas) return;
      canvas.width = bc.width;
      canvas.height = bc.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (hasFilter) {
        ctx.filter = f.css;
      }
      ctx.drawImage(bc, 0, 0);
      ctx.filter = "none";
      _saveCapture(canvas);
    } else {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      if (hasFilter) {
        ctx.filter = f.css;
      }
      ctx.drawImage(video, 0, 0);
      ctx.filter = "none";
      _saveCapture(canvas);
    }
  };

  const _saveCapture = (canvas: HTMLCanvasElement) => {
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 250);
    const url = canvas.toDataURL("image/jpeg", 0.95);
    const now = Date.now();
    const item: MediaItem = {
      type: "photo",
      url,
      id: String(now),
      capturedAt: now,
    };
    setCaptures((prev) => [item, ...prev]);
    onCapture?.(item);
  };

  const flipCamera = () => {
    setZoom(1);
    zoomRef.current = 1;
    if (videoRef.current) videoRef.current.style.transform = "";
    engineRef.current?.dispose();
    engineRef.current = null;
    setShowBeauty(false);
    setFacingMode((f) => (f === "environment" ? "user" : "environment"));
  };

  const handleDelete = (ids: string | string[]) => {
    setCaptures((prev) =>
      Array.isArray(ids)
        ? prev.filter((c) => !ids.includes(c.id))
        : prev.filter((c) => c.id !== ids),
    );
  };

  const toggleBeauty = () => {
    const next = !showBeauty;
    setShowBeauty(next);
    if (next) {
      setShowFilter(false);
      if (!engineRef.current && cameraReady) void initBeauty();
    }
  };

  const toggleFilter = () => {
    const next = !showFilter;
    setShowFilter(next);
    if (next) setShowBeauty(false);
  };

  const shutterClass = [
    "cam__shutter",
    !cameraReady ? "cam__shutter--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="cam">
      <div className={`cam__flash ${flashVisible ? "cam__flash--on" : ""}`} />
      <div className="cam__grain" />

      <video
        ref={videoRef}
        className={`cam__video ${facingMode === "user" ? "cam__video--mirrored" : ""} ${beautyOn ? "cam__video--hidden" : ""}`}
        autoPlay
        playsInline
        muted
        onTouchStart={handleVideoTouchStart}
        onTouchMove={handleVideoTouchMove}
        onTouchEnd={handleVideoTouchEnd}
        style={{ touchAction: "none", transition: "filter 0.25s ease" }}
      />

      <canvas
        ref={beautyCanvasRef}
        className={`cam__beauty-canvas ${beautyOn ? "cam__beauty-canvas--visible" : ""}`}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas ref={captureCanvasRef} style={{ display: "none" }} />

      {showGrid && <div className="cam__grid" />}

      <div
        className={`cam__zoom-overlay ${showZoomUI ? "cam__zoom-overlay--visible" : ""}`}
      >
        <div className="cam__zoom-value">{zoom.toFixed(1)}x</div>
        <div className="cam__zoom-bar">
          <span className="cam__zoom-limit">0.5x</span>
          <div className="cam__zoom-track">
            <div
              className="cam__zoom-fill"
              style={{ width: `${((zoom - 0.5) / 4.5) * 100}%` }}
            />
          </div>
          <span className="cam__zoom-limit">5x</span>
        </div>
      </div>

      {beautyLoading && (
        <div className="cam__beauty-loading">
          <div className="cam__beauty-spinner" />
          <span>리터치 준비 중...</span>
        </div>
      )}

      <div className="cam__header">
        <div className="cam__logo">re-mon</div>
        <div className="cam__header-actions">
          <button
            className={`cam__icon-btn ${showGrid ? "cam__icon-btn--active" : ""}`}
            onClick={() => setShowGrid((v) => !v)}
            aria-label="그리드"
          >
            <CompositionIcon />
          </button>

          <button
            className={`cam__icon-btn ${showBeauty || anyBeauty ? "cam__icon-btn--active" : ""}`}
            onClick={toggleBeauty}
            aria-label="리터치"
          >
            <BeautyIcon />
            {anyBeauty && !showBeauty && <span className="cam__icon-btn-dot" />}
          </button>

          <button
            className={`cam__icon-btn ${showFilter || activeFilter.id !== "normal" ? "cam__icon-btn--active" : ""}`}
            onClick={toggleFilter}
            aria-label="필터"
          >
            <FilterIcon />
            {activeFilter.id !== "normal" && !showFilter && (
              <span className="cam__icon-btn-dot" />
            )}
          </button>

          {onLogout && (
            <button
              className="cam__icon-btn"
              onClick={onLogout}
              aria-label="로그아웃"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="cam__bottom">
        <div
          className={`cam__controls ${panelOpen ? "cam__controls--hidden" : ""}`}
        >
          <button
            className="cam__gallery-thumb"
            onClick={() => captures.length > 0 && setShowGallery(true)}
            aria-label="갤러리 열기"
          >
            {captures[0] ? (
              <img src={captures[0].url} alt="최근 캡처" />
            ) : (
              <div className="cam__gallery-thumb-empty" />
            )}
            {captures.length > 0 && (
              <span className="cam__gallery-count">{captures.length}</span>
            )}
          </button>

          <div className="cam__shutter-group">
            <button
              className="cam__flip-btn"
              onClick={flipCamera}
              aria-label="카메라 전환"
            >
              <FlipIcon />
            </button>
            <button
              className={shutterClass}
              onClick={takePhoto}
              disabled={!cameraReady}
              aria-label="사진 촬영"
            >
              <div className="cam__shutter-inner" />
            </button>
          </div>

          <button
            className="cam__frame-btn"
            onClick={() => setShowFrameStudio(true)}
            aria-label="프레임 스튜디오"
          >
            <FrameIcon />
            <span>프레임</span>
          </button>
        </div>

        {showBeauty && (
          <FaceBeautyPanel
            params={beautyParams}
            onChange={(p) => {
              setBeautyParams(p);
              if (
                Object.values(p).some((v) => v !== 0) &&
                !engineRef.current &&
                cameraReady
              )
                void initBeauty();
            }}
            onClose={() => {
              setShowBeauty(false);
              setBeautyParams({ ...DEFAULT_BEAUTY });
            }}
            onConfirm={() => setShowBeauty(false)}
          />
        )}

        {showFilter && (
          <FilterSelector
            activeId={activeFilter.id}
            onChange={handleFilterChange}
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          />
        )}
      </div>

      {showGallery && (
        <Gallery
          captures={captures}
          onClose={() => setShowGallery(false)}
          onDelete={handleDelete}
        />
      )}
      {showFrameStudio && (
        <FrameStudio
          captures={captures}
          onClose={() => setShowFrameStudio(false)}
        />
      )}

      {error && (
        <div className="cam__error">
          <span>⚠ {error}</span>
        </div>
      )}
    </div>
  );
};

export default CameraScreen;
