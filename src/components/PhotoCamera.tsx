import { useState, useRef } from "react";
import type { MediaItem, Screen } from "../types";

interface PhotoCameraProps {
  onCapture: () => void;
  onFlip: () => void;
  lastItem?: MediaItem;
  onNavigate: (screen: Screen) => void;
  onZoomChange?: (zoom: number) => void;
}

const PhotoCamera = ({
  onCapture,
  onFlip,
  lastItem,
  onNavigate,
  onZoomChange,
}: PhotoCameraProps) => {
  const [zoom, setZoom] = useState<number>(0.5);
  const [isZooming, setIsZooming] = useState<boolean>(false);

  const startDistanceRef = useRef<number>(0);
  const startZoomRef = useRef<number>(0.5);
  const timeoutRef = useRef<number | null>(null);

  const getDistance = (touches: React.TouchList) => {
    const t1 = touches[0];
    const t2 = touches[1];
    return Math.sqrt(
      Math.pow(t2.clientX - t1.clientX, 2) +
        Math.pow(t2.clientY - t1.clientY, 2),
    );
  };

  const updateZoom = (targetZoom: number) => {
    const constrainedZoom = Math.max(0.5, Math.min(5, targetZoom));
    const roundedZoom = Math.round(constrainedZoom * 10) / 10;
    setZoom(roundedZoom);
    setIsZooming(true);
    if (onZoomChange) onZoomChange(roundedZoom);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      startDistanceRef.current = getDistance(e.touches);
      startZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && startDistanceRef.current > 0) {
      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / startDistanceRef.current;
      updateZoom(startZoomRef.current * scale);
    }
  };

  const handleTouchEnd = () => {
    startDistanceRef.current = 0;
    timeoutRef.current = window.setTimeout(() => {
      setIsZooming(false);
    }, 1500);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomStep = 0.1;
    const nextZoom = e.deltaY < 0 ? zoom + zoomStep : zoom - zoomStep;
    updateZoom(nextZoom);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsZooming(false);
    }, 1200);
  };

  return (
    <div
      className="camera__controls"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      style={{ touchAction: "none", position: "relative" }}
    >
      <div className={`camera__zoom-ui ${isZooming ? "visible" : ""}`}>
        <div className="zoom-value">{zoom}x</div>
        <div className="zoom-bar-container">
          <span className="zoom-limit">0.5x</span>
          <div className="zoom-bar-track">
            <div
              className="zoom-bar-fill"
              style={{ width: `${((zoom - 0.5) / 4.5) * 100}%` }}
            />
          </div>
          <span className="zoom-limit">5x</span>
        </div>
      </div>

      <div className="camera__thumb" onClick={() => onNavigate("gallery")}>
        {lastItem ? (
          <img src={lastItem.url} alt="last capture" />
        ) : (
          <span className="camera__thumb-empty">🖼️</span>
        )}
      </div>

      <div className="camera__shutter-center">
        <button className="camera__shutter" onClick={onCapture}>
          <div className="camera__shutter-inner" />
        </button>
      </div>

      <button className="camera__flip" onClick={onFlip}>
        🔄
      </button>
    </div>
  );
};

export default PhotoCamera;
