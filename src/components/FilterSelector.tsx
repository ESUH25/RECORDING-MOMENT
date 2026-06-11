import { useRef, useEffect, useState } from "react";
import type { CameraFilter } from "../types";
import "./FilterSelector.css";

// eslint-disable-next-line react-refresh/only-export-components
export const FILTERS: CameraFilter[] = [
  {
    id: "normal",
    name: "Normal",
    css: "none",
    matrix: null,
  },
  {
    // 선명하고 채도 높음 — 화사한 느낌
    id: "vivid",
    name: "Vivid",
    css: "saturate(2.0) contrast(1.18) brightness(1.05)",
    matrix: null,
  },
  {
    // 밝고 뽀얀 — 인물 셀카에 최적
    id: "bright",
    name: "Bright",
    css: "brightness(1.25) contrast(0.92) saturate(1.1)",
    matrix: null,
  },
  {
    // 색 빠진 필름 감성
    id: "fade",
    name: "Fade",
    css: "saturate(0.55) brightness(1.15) contrast(0.82)",
    matrix: null,
  },
  {
    // 완전 흑백
    id: "mono",
    name: "Mono",
    css: "grayscale(1) contrast(1.15) brightness(1.05)",
    matrix: [
      0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0,
      0, 0, 1, 0,
    ],
  },
  {
    // 고대비 흑백 — 드라마틱
    id: "noir",
    name: "Noir",
    css: "grayscale(1) contrast(1.6) brightness(0.82)",
    matrix: [
      0.33, 0.33, 0.33, 0, -30, 0.33, 0.33, 0.33, 0, -30, 0.33, 0.33, 0.33, 0,
      -30, 0, 0, 0, 1, 0,
    ],
  },
  {
    // 따뜻한 오렌지빛 — 골든아워
    id: "warm",
    name: "Warm",
    css: "sepia(0.55) saturate(1.6) brightness(1.08) contrast(1.05)",
    matrix: null,
  },
  {
    // 시원한 블루 톤
    id: "cool",
    name: "Cool",
    css: "hue-rotate(195deg) saturate(1.4) brightness(1.05) contrast(1.08)",
    matrix: null,
  },
  {
    // 진한 황금빛 — 인스타 감성
    id: "golden",
    name: "Golden",
    css: "sepia(0.75) saturate(2.0) brightness(1.12) contrast(1.1)",
    matrix: null,
  },
  {
    // 영화같은 청록 계열
    id: "cinema",
    name: "Cinema",
    css: "contrast(1.4) saturate(0.75) brightness(0.88) hue-rotate(8deg)",
    matrix: null,
  },
  {
    // 몽환적 소프트 — 연분홍빛
    id: "dream",
    name: "Dream",
    css: "brightness(1.15) saturate(0.78) contrast(0.82) hue-rotate(-12deg)",
    matrix: null,
  },
  {
    // 보라빛 무드
    id: "purple",
    name: "Purple",
    css: "hue-rotate(260deg) saturate(1.5) brightness(1.0) contrast(1.1)",
    matrix: null,
  },
];

interface Props {
  activeId: string;
  onChange: (filter: CameraFilter) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export default function FilterSelector({
  activeId,
  onChange,
  videoRef,
}: Props) {
  const thumbsRef = useRef<Map<string, string>>(new Map());
  const [thumbsMap, setThumbsMap] = useState<Map<string, string>>(new Map());
  const capturedRef = useRef(false);

  useEffect(() => {
    if (capturedRef.current) return;
    const tryCapture = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;
      capturedRef.current = true;
      const SIZE = 80;
      const base = document.createElement("canvas");
      base.width = base.height = SIZE;
      const bctx = base.getContext("2d")!;
      const vw = video.videoWidth,
        vh = video.videoHeight;
      const side = Math.min(vw, vh);
      const sx = (vw - side) / 2,
        sy = (vh - side) / 2;
      bctx.drawImage(video, sx, sy, side, side, 0, 0, SIZE, SIZE);

      FILTERS.forEach((f) => {
        const tc = document.createElement("canvas");
        tc.width = tc.height = SIZE;
        const tctx = tc.getContext("2d")!;
        if (f.matrix) {
          const imgData = bctx.getImageData(0, 0, SIZE, SIZE);
          const d = imgData.data,
            m = f.matrix;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i],
              g = d[i + 1],
              b = d[i + 2];
            d[i] = Math.min(
              255,
              Math.max(0, m[0] * r + m[1] * g + m[2] * b + (m[4] ?? 0) * 255),
            );
            d[i + 1] = Math.min(
              255,
              Math.max(0, m[5] * r + m[6] * g + m[7] * b + (m[9] ?? 0) * 255),
            );
            d[i + 2] = Math.min(
              255,
              Math.max(
                0,
                m[10] * r + m[11] * g + m[12] * b + (m[14] ?? 0) * 255,
              ),
            );
          }
          tctx.putImageData(imgData, 0, 0);
        } else {
          tctx.filter = f.css === "none" ? "none" : f.css;
          tctx.drawImage(video, sx, sy, side, side, 0, 0, SIZE, SIZE);
          tctx.filter = "none";
        }
        thumbsRef.current.set(f.id, tc.toDataURL("image/jpeg", 0.75));
      });
      setThumbsMap(new Map(thumbsRef.current));
    };

    const timer = setInterval(() => {
      if (capturedRef.current) {
        clearInterval(timer);
        return;
      }
      tryCapture();
    }, 300);
    return () => clearInterval(timer);
  }, [videoRef]);

  return (
    <div className="flt">
      <div className="flt__scroll">
        {FILTERS.map((f) => {
          const thumb = thumbsMap.get(f.id);
          const isActive = f.id === activeId;
          return (
            <button
              key={f.id}
              className={`flt__item ${isActive ? "flt__item--on" : ""}`}
              onClick={() => onChange(f)}
              type="button"
            >
              <div className="flt__thumb-wrap">
                {thumb ? (
                  <img src={thumb} alt={f.name} className="flt__thumb-img" />
                ) : (
                  <div className="flt__thumb-placeholder" />
                )}
                {isActive && <div className="flt__thumb-ring" />}
              </div>
              <span className="flt__label">{f.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
