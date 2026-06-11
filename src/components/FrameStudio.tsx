import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { MediaItem } from "../types";
import AdminPanel from "./AdminPanel";
import type { ManagedFrame, PhotoInset } from "../store/framestore";
import {
  getFramesAsync,
  subscribeToFrames,
  loadOverlayImage,
} from "../store/framestore";
import "./FrameStudio.css";

const _pngSubs = new Set<() => void>();

function usePngReady() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((v) => v + 1);
    _pngSubs.add(fn);
    return () => {
      _pngSubs.delete(fn);
    };
  }, []);
  return tick;
}

type PhotoAdj = { panX: number; panY: number; zoom: number };
const DEF_ADJ: PhotoAdj = { panX: 0, panY: -0.15, zoom: 1.0 };

type FSStep = "select-frame" | "select-photos" | "preview";
interface FrameSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
}

interface BuiltInFrame {
  id: string;
  name: string;
  tag: string;
  slotCount: number;
  aspect: number;
  slots: FrameSlot[];
  bg: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void;
  overlay?: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void;
}

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 0,
) {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  if (r > 0) {
    ctx.beginPath();
    rrect(ctx, x, y, w, h, r);
    ctx.clip();
  }
  const iR = img.naturalWidth / img.naturalHeight,
    cR = w / h;
  let sx = 0,
    sy = 0,
    sw = img.naturalWidth,
    sh = img.naturalHeight;
  if (iR > cR) {
    sw = img.naturalHeight * cR;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / cR;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function drawCoverAdjusted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  adj: PhotoAdj,
) {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.beginPath();
  if (r > 0) rrect(ctx, x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.clip();

  const iR = img.naturalWidth / img.naturalHeight,
    cR = w / h;
  let dw: number, dh: number;
  if (iR > cR) {
    dh = h;
    dw = h * iR;
  } else {
    dw = w;
    dh = w / iR;
  }
  dw *= adj.zoom;
  dh *= adj.zoom;

  const maxPanX = Math.max(0, (dw - w) / 2);
  const maxPanY = Math.max(0, (dh - h) / 2);
  const imgX = x + (w - dw) / 2 + adj.panX * maxPanX;
  const imgY = y + (h - dh) / 2 + adj.panY * maxPanY;

  ctx.drawImage(img, imgX, imgY, dw, dh);
  ctx.restore();
}

const FRAMES: BuiltInFrame[] = [];

function FrameCard({
  frame,
  active,
  onSelect,
}: {
  frame: BuiltInFrame;
  active: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const CANVAS = 68;
  const tick = usePngReady();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = c.height = CANVAS;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    try {
      const isWide = frame.aspect >= 1;
      const fw = isWide ? CANVAS : Math.round(CANVAS * frame.aspect);
      const fh = isWide ? Math.round(CANVAS / frame.aspect) : CANVAS;
      ctx.fillStyle = "#E8D4B8";
      ctx.fillRect(0, 0, CANVAS, CANVAS);
      ctx.save();
      ctx.translate(
        Math.round((CANVAS - fw) / 2),
        Math.round((CANVAS - fh) / 2),
      );
      frame.bg(ctx, fw, fh);
      frame.slots.forEach((slot, i) => {
        const sx = slot.x * fw,
          sy = slot.y * fh;
        const sw = slot.w * fw,
          sh = slot.h * fh;
        const r = slot.r ? slot.r * Math.min(sw, sh) : 2;
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        rrect(ctx, sx, sy, sw, sh, r);
        ctx.fill();
        ctx.stroke();
        if (frame.slotCount > 1) {
          ctx.font = `bold ${Math.min(sw, sh) * 0.36}px sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(i + 1), sx + sw / 2, sy + sh / 2);
        }
      });
      frame.overlay?.(ctx, fw, fh);
      ctx.restore();
    } catch {
      /* */
    }
  }, [frame, tick]);

  return (
    <button
      className={`fsc__card ${active ? "fsc__card--on" : ""}`}
      onClick={onSelect}
      type="button"
    >
      <canvas
        ref={ref}
        width={CANVAS}
        height={CANVAS}
        className="fsc__card-canvas"
        style={{ pointerEvents: "none" }}
      />
      <span className="fsc__card-name">{frame.name}</span>
      <span className="fsc__card-slot">{frame.slotCount}컷</span>
    </button>
  );
}

function LivePreview({
  frame,
  items,
  loadedImgs,
}: {
  frame: BuiltInFrame;
  items: MediaItem[];
  loadedImgs: Map<string, HTMLImageElement>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tick = usePngReady();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = 200;
    c.height = Math.round(200 / frame.aspect);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    try {
      frame.bg(ctx, c.width, c.height);
      frame.slots.forEach((slot, i) => {
        const sx = slot.x * c.width,
          sy = slot.y * c.height;
        const sw = slot.w * c.width,
          sh = slot.h * c.height;
        const r = slot.r ? slot.r * Math.min(sw, sh) : 0;
        const img = items[i] ? loadedImgs.get(items[i].id) : null;
        if (img) {
          drawCover(ctx, img, sx, sy, sw, sh, r);
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          rrect(ctx, sx, sy, sw, sh, Math.max(r, 3));
          ctx.fill();
          ctx.stroke();
          ctx.font = `${Math.min(sw, sh) * 0.3}px sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", sx + sw / 2, sy + sh / 2);
        }
      });
      frame.overlay?.(ctx, c.width, c.height);
    } catch {
      /* */
    }
  }, [frame, items, loadedImgs, tick]);

  return (
    <canvas
      ref={ref}
      className="fsc__live-canvas"
      style={{ pointerEvents: "none" }}
    />
  );
}

interface Props {
  captures: MediaItem[];
  onClose: () => void;
}

export default function FrameStudio({ captures, onClose }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mountedAt] = useState(() => Date.now());

  const [step, setStep] = useState<FSStep>("select-frame");
  const [frame, setFrame] = useState<BuiltInFrame | null>(null);
  const [selItems, setSelItems] = useState<MediaItem[]>([]);
  const [loadedImgs, setLoadedImgs] = useState<Map<string, HTMLImageElement>>(
    new Map(),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tapProg, setTapProg] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);

  const [adminFrames, setAdminFrames] = useState<ManagedFrame[]>([]);
  const [overlayCache, setOverlayCache] = useState<
    Map<string, HTMLImageElement>
  >(new Map());
  const [framesLoading, setFramesLoading] = useState(true);

  const [adjEntry, setAdjEntry] = useState<{
    frameId: string;
    values: PhotoAdj[];
  } | null>(null);

  const adjs: PhotoAdj[] = useMemo(() => {
    if (!frame) return [];
    if (!adjEntry || adjEntry.frameId !== frame.id) {
      return Array.from({ length: frame.slotCount }, () => ({ ...DEF_ADJ }));
    }
    return adjEntry.values;
  }, [adjEntry, frame]);

  const adjsRef = useRef<PhotoAdj[]>([]);
  useEffect(() => {
    adjsRef.current = adjs;
  }, [adjs]);

  const patchAdj = useCallback(
    (idx: number, patch: Partial<PhotoAdj>) => {
      setAdjEntry((prev) => {
        const frameId = frame?.id ?? "";
        const base =
          prev?.frameId === frameId
            ? prev.values
            : Array.from({ length: frame?.slotCount ?? 0 }, () => ({
                ...DEF_ADJ,
              }));
        const next = [...base];
        next[idx] = { ...(next[idx] ?? DEF_ADJ), ...patch };
        return { frameId, values: next };
      });
    },
    [frame],
  );

  const ptrs = useRef(
    new Map<number, { x: number; y: number; slotIdx: number }>(),
  );
  const pinch = useRef<{
    slotIdx: number;
    startDist: number;
    startZoom: number;
  } | null>(null);

  const getSlotAt = useCallback(
    (cx: number, cy: number, canvas: HTMLCanvasElement) => {
      if (!frame) return -1;
      return frame.slots.findIndex((s) => {
        const sx = s.x * canvas.width,
          sy = s.y * canvas.height;
        return (
          cx >= sx &&
          cx <= sx + s.w * canvas.width &&
          cy >= sy &&
          cy <= sy + s.h * canvas.height
        );
      });
    },
    [frame],
  );

  const handlePtrDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = previewRef.current;
      if (!canvas) return;
      (e.target as Element).setPointerCapture(e.pointerId);

      const r = canvas.getBoundingClientRect();
      const cx = (e.clientX - r.left) * (canvas.width / r.width);
      const cy = (e.clientY - r.top) * (canvas.height / r.height);
      const slotIdx = getSlotAt(cx, cy, canvas);
      if (slotIdx < 0 || !selItems[slotIdx]) return;

      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY, slotIdx });

      const all = [...ptrs.current.values()];
      if (all.length === 2) {
        const [p1, p2] = all;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        pinch.current = {
          slotIdx,
          startDist: dist,
          startZoom: (adjsRef.current[slotIdx] ?? DEF_ADJ).zoom,
        };
      }
    },
    [getSlotAt, selItems],
  );

  const handlePtrMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!frame) return;
      const ptr = ptrs.current.get(e.pointerId);
      if (!ptr) return;

      const dx_s = e.clientX - ptr.x;
      const dy_s = e.clientY - ptr.y;
      ptr.x = e.clientX;
      ptr.y = e.clientY;

      const slotIdx = ptr.slotIdx;
      const canvas = previewRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const slot = frame.slots[slotIdx];
      if (!slot) return;

      const all = [...ptrs.current.values()];
      if (pinch.current && all.length >= 2) {
        const [p1, p2] = all;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const newZoom = Math.max(
          1.0,
          Math.min(
            4.0,
            pinch.current.startZoom * (dist / pinch.current.startDist),
          ),
        );
        patchAdj(pinch.current.slotIdx, { zoom: newZoom });
        return;
      }

      if (ptrs.current.size > 1) return;

      const scX = canvas.width / rect.width;
      const scY = canvas.height / rect.height;
      const dx_c = dx_s * scX;
      const dy_c = dy_s * scY;

      const slotW = slot.w * canvas.width;
      const slotH = slot.h * canvas.height;
      const cur = adjsRef.current[slotIdx] ?? DEF_ADJ;

      const item = selItems[slotIdx];
      const img = item ? loadedImgs.get(item.id) : null;

      let maxPanX: number;
      let maxPanY: number;

      if (img && img.naturalWidth > 0) {
        const iR = img.naturalWidth / img.naturalHeight;
        const cR = slotW / slotH;
        let dw: number, dh: number;
        if (iR > cR) {
          dh = slotH;
          dw = slotH * iR;
        } else {
          dw = slotW;
          dh = slotW / iR;
        }
        dw *= cur.zoom;
        dh *= cur.zoom;
        maxPanX = Math.max(0, (dw - slotW) / 2);
        maxPanY = Math.max(0, (dh - slotH) / 2);
      } else {
        maxPanX = Math.max(0, (slotW * (cur.zoom - 1)) / 2);
        maxPanY = Math.max(0, (slotH * (cur.zoom - 1)) / 2);
      }

      patchAdj(slotIdx, {
        panX:
          maxPanX > 0
            ? Math.max(-1, Math.min(1, cur.panX + dx_c / maxPanX))
            : cur.panX,
        panY:
          maxPanY > 0
            ? Math.max(-1, Math.min(1, cur.panY + dy_c / maxPanY))
            : cur.panY,
      });
    },
    [frame, selItems, loadedImgs, patchAdj],
  );

  const handlePtrUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      ptrs.current.delete(e.pointerId);
      if (ptrs.current.size < 2) pinch.current = null;
    },
    [],
  );

  useEffect(() => {
    if (step !== "preview") return;
    const canvas = previewRef.current;
    if (!canvas || !frame) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
      const idx = frame.slots.findIndex((s) => {
        const sx = s.x * canvas.width,
          sy = s.y * canvas.height;
        return (
          cx >= sx &&
          cx <= sx + s.w * canvas.width &&
          cy >= sy &&
          cy <= sy + s.h * canvas.height
        );
      });
      if (idx < 0 || !selItems[idx]) return;
      const cur = adjsRef.current[idx] ?? DEF_ADJ;
      const newZoom = Math.max(
        1.0,
        Math.min(4.0, cur.zoom + (e.deltaY > 0 ? -0.15 : 0.15)),
      );
      patchAdj(idx, { zoom: newZoom });
    };
    canvas.addEventListener("wheel", fn, { passive: false });
    return () => canvas.removeEventListener("wheel", fn);
  }, [step, frame, selItems, patchAdj]);

  const toBuiltIn = useCallback(
    (mf: ManagedFrame): BuiltInFrame => {
      const { inset } = mf;
      const img = overlayCache.get(mf.id);
      const n = mf.numSlots ?? 1;
      const aX = inset.left / 100,
        aY = inset.top / 100;
      const aW = 1 - (inset.left + inset.right) / 100;
      const aH = 1 - (inset.top + inset.bottom) / 100;
      let slots: FrameSlot[];
      if (
        mf.slotInsets &&
        Array.isArray(mf.slotInsets) &&
        mf.slotInsets.length === n
      ) {
        slots = (mf.slotInsets as PhotoInset[]).map((si) => ({
          x: si.left / 100,
          y: si.top / 100,
          w: 1 - (si.left + si.right) / 100,
          h: 1 - (si.top + si.bottom) / 100,
        }));
      } else if (n === 4) {
        const sw = aW / 2,
          sh = aH / 2;
        slots = [
          { x: aX, y: aY, w: sw, h: sh },
          { x: aX + sw, y: aY, w: sw, h: sh },
          { x: aX, y: aY + sh, w: sw, h: sh },
          { x: aX + sw, y: aY + sh, w: sw, h: sh },
        ];
      } else {
        const sh = aH / Math.max(n, 1);
        slots = Array.from({ length: Math.max(n, 1) }, (_, i) => ({
          x: aX,
          y: aY + i * sh,
          w: aW,
          h: sh,
        }));
      }
      return {
        id: mf.id,
        name: mf.name,
        tag: mf.tag,
        slotCount: n,
        aspect: 1.0,
        slots,
        bg(ctx, cw, ch) {
          ctx.fillStyle = mf.bgColor;
          ctx.fillRect(0, 0, cw, ch);
        },
        ...(img && {
          overlay(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
            ctx.drawImage(img, 0, 0, cw, ch);
          },
        }),
      };
    },
    [overlayCache],
  );

  useEffect(() => {
    const load = async () => {
      setFramesLoading(true);
      try {
        const managed = await getFramesAsync();
        setAdminFrames(managed);
        const entries = await Promise.all(
          managed.map(async (mf) => {
            if (!mf.overlayDataUrl) return null;
            try {
              return [mf.id, await loadOverlayImage(mf.overlayDataUrl)] as [
                string,
                HTMLImageElement,
              ];
            } catch {
              return null;
            }
          }),
        );
        const c = new Map<string, HTMLImageElement>();
        entries.forEach((e) => {
          if (e) c.set(e[0], e[1]);
        });
        setOverlayCache(c);
      } catch (err) {
        console.error("[FrameStudio]", err);
      } finally {
        setFramesLoading(false);
      }
    };
    void load();
    return subscribeToFrames(() => {
      void load();
    });
  }, []);

  const allFrames = useMemo(
    () => [...FRAMES, ...adminFrames.map(toBuiltIn)],
    [adminFrames, toBuiltIn],
  );

  const mediaItems = useMemo(() => {
    const H24 = 24 * 60 * 60 * 1000;
    return (captures ?? [])
      .filter((c) => c.type === "photo" || mountedAt - c.capturedAt <= H24)
      .sort((a, b) => b.capturedAt - a.capturedAt);
  }, [captures, mountedAt]);

  useEffect(() => {
    mediaItems.forEach((item) => {
      if (loadedImgs.has(item.id)) return;
      if (item.type === "photo") {
        const img = new Image();
        img.onload = () => setLoadedImgs((p) => new Map(p).set(item.id, img));
        img.src = item.url;
      } else if (item.type === "video") {
        const video = document.createElement("video");
        video.src = item.url;
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 0.1;
        video.onloadeddata = () => {
          const c = document.createElement("canvas");
          c.width = video.videoWidth || 320;
          c.height = video.videoHeight || 240;
          c.getContext("2d")?.drawImage(video, 0, 0);
          const thumb = new Image();
          thumb.onload = () =>
            setLoadedImgs((p) => new Map(p).set(item.id, thumb));
          thumb.src = c.toDataURL("image/jpeg", 0.8);
        };
      }
    });
  }, [loadedImgs, mediaItems]);

  const renderPreview = useCallback(async () => {
    const canvas = previewRef.current;
    if (!canvas || !frame) return;
    const BASE = 1080,
      cw = BASE,
      ch = Math.round(BASE / frame.aspect);
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      frame.bg(ctx, cw, ch);
      frame.slots.forEach((slot, i) => {
        const img = selItems[i] ? loadedImgs.get(selItems[i].id) : null;
        if (!img) return;
        const adj = adjs[i] ?? DEF_ADJ;
        drawCoverAdjusted(
          ctx,
          img,
          slot.x * cw,
          slot.y * ch,
          slot.w * cw,
          slot.h * ch,
          slot.r ? slot.r * Math.min(slot.w * cw, slot.h * ch) : 0,
          adj,
        );
      });
      frame.overlay?.(ctx, cw, ch);
    } catch {
      /* */
    }
  }, [frame, selItems, loadedImgs, adjs]);

  useEffect(() => {
    if (step === "preview") void renderPreview();
  }, [step, renderPreview]);

  const handleSelectFrame = useCallback((f: BuiltInFrame) => {
    setFrame(f);
    setSelItems([]);
    setStep("select-photos");
  }, []);

  const handleTogglePhoto = (item: MediaItem) => {
    if (!frame) return;
    setSelItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx !== -1) return prev.filter((p) => p.id !== item.id);
      if (prev.length >= frame.slotCount) return prev;
      const next = [...prev, item];
      if (next.length === frame.slotCount) {
        setAdjEntry({
          frameId: frame.id,
          values: Array.from({ length: frame.slotCount }, () => ({
            ...DEF_ADJ,
          })),
        });
        setTimeout(() => setStep("preview"), 200);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const canvas = previewRef.current;
    if (!canvas || saving) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("blob"))),
          "image/jpeg",
          0.96,
        ),
      );
      const file = new File([blob], `remon-frame-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "re-mon 프레임 사진" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* */
    }
    setSaving(false);
  };

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 2000) tapCountRef.current = 0;
    tapCountRef.current++;
    lastTapRef.current = now;
    setTapProg(tapCountRef.current);
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      setTapProg(0);
    }, 2000);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      lastTapRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      setTapProg(0);
      setShowAdmin(true);
    }
  };

  const goBack = () => {
    if (step === "select-frame") {
      onClose();
      return;
    }
    if (step === "select-photos") {
      setStep("select-frame");
      setSelItems([]);
      return;
    }
    setStep("select-photos");
  };

  return (
    <>
      <div className="fsc">
        <div className="fsc__grain" />

        <div className="fsc__header">
          <button className="fsc__nav-btn" onClick={goBack} type="button">
            {step === "select-frame" ? "✕" : "←"}
          </button>
          <div className="fsc__header-mid" onClick={handleLogoTap}>
            <span className="fsc__logo">re-mon</span>
            <div className="fsc__tap-dots" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`fsc__tap-dot ${i < tapProg ? "fsc__tap-dot--on" : ""}`}
                />
              ))}
            </div>
            <span className="fsc__step-label">
              {step === "select-frame"
                ? "Frame Studio"
                : step === "select-photos"
                  ? `사진 선택 ${selItems.length} / ${frame?.slotCount ?? 0}`
                  : "미리보기"}
            </span>
          </div>
          {step === "preview" ? (
            <button
              className={`fsc__save-btn ${saved ? "fsc__save-btn--done" : ""}`}
              onClick={() => {
                void handleSave();
              }}
              disabled={saving}
              type="button"
            >
              {saving ? "···" : saved ? "✓" : "저장"}
            </button>
          ) : (
            <div style={{ width: 52 }} />
          )}
        </div>

        {step === "select-frame" && (
          <div className="fsc__frame-step">
            {framesLoading && (
              <p className="fsc__loading-hint">프레임 불러오는 중...</p>
            )}
            <p className="fsc__hint">사용할 프레임을 선택하세요</p>
            <div className="fsc__frame-grid">
              {allFrames.map((f) => (
                <FrameCard
                  key={f.id}
                  frame={f}
                  active={frame?.id === f.id}
                  onSelect={() => handleSelectFrame(f)}
                />
              ))}
            </div>
            {!framesLoading && adminFrames.length > 0 && (
              <p className="fsc__admin-count">
                📌 내 프레임 {adminFrames.length}개 포함
              </p>
            )}
          </div>
        )}

        {step === "select-photos" && frame && (
          <div className="fsc__photos-step">
            <div className="fsc__live-area">
              <LivePreview
                frame={frame}
                items={selItems}
                loadedImgs={loadedImgs}
              />
              <p className="fsc__live-hint">
                {selItems.length < frame.slotCount
                  ? `사진 ${frame.slotCount - selItems.length}장 더 선택`
                  : "완료! 미리보기로 이동 중..."}
              </p>
            </div>
            <div className="fsc__sheet">
              <div className="fsc__sheet-pill" />
              <div className="fsc__sheet-head">
                <span className="fsc__sheet-title">사진 선택</span>
                <span className="fsc__sheet-prog">
                  {selItems.length} / {frame.slotCount}
                </span>
              </div>
              {mediaItems.length === 0 ? (
                <div className="fsc__sheet-empty">
                  <p>📸 촬영된 사진이 없어요</p>
                  <p>사진을 찍거나 영상을 촬영한 뒤 다시 시도해 주세요</p>
                </div>
              ) : (
                <div className="fsc__photo-grid">
                  {mediaItems.map((item) => {
                    const si = selItems.findIndex((s) => s.id === item.id);
                    const isSel = si !== -1;
                    const isFull = !isSel && selItems.length >= frame.slotCount;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={[
                          "fsc__photo",
                          isSel ? "fsc__photo--sel" : "",
                          isFull ? "fsc__photo--dim" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => handleTogglePhoto(item)}
                        disabled={isFull}
                      >
                        <div className="fsc__photo-sq">
                          <img
                            src={item.url}
                            alt=""
                            style={{ pointerEvents: "none" }}
                          />
                          {isSel && (
                            <div className="fsc__photo-num">{si + 1}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="fsc__preview-step">
            <canvas
              ref={previewRef}
              className="fsc__preview-canvas"
              onPointerDown={handlePtrDown}
              onPointerMove={handlePtrMove}
              onPointerUp={handlePtrUp}
              onPointerCancel={handlePtrUp}
            />
            <div className="fsc__preview-btns">
              <button
                type="button"
                className="fsc__sec-btn"
                onClick={() => setStep("select-photos")}
              >
                다시 선택
              </button>
              <button
                type="button"
                className="fsc__sec-btn"
                onClick={() => {
                  setStep("select-frame");
                  setSelItems([]);
                }}
              >
                프레임 변경
              </button>
            </div>
          </div>
        )}
      </div>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </>
  );
}
