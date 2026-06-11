import React, { useState } from "react";
import type { MediaItem } from "../types.ts";
import FrameStudio from "./FrameStudio.tsx";
import "./Gallery.css";

const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtTime = (ts: number): string =>
  new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const TrashIcon = () => (
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
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

const DownloadIcon = () => (
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
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

interface GalleryProps {
  captures: MediaItem[];
  onClose: () => void;
  onDelete: (id: string | string[]) => void;
  onOpenFrameStudio?: () => void;
}

function groupByDate(items: MediaItem[]) {
  const map = new Map<string, MediaItem[]>();
  [...items]
    .filter((item) => item.type === "photo")
    .sort((a, b) => b.capturedAt - a.capturedAt)
    .forEach((item) => {
      const key = new Date(item.capturedAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
  return map;
}

const Gallery: React.FC<GalleryProps> = ({ captures, onClose, onDelete }) => {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [showFrame, setShowFrame] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const grouped = groupByDate(captures);
  const photoCount = captures.filter((c) => c.type === "photo").length;

  const handleDownload = (item: MediaItem) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = `remon-${item.id}.jpg`;
    a.click();
  };

  const handleDelete = (item: MediaItem) => {
    if (!window.confirm("이 사진을 삭제하시겠어요?")) return;
    onDelete(item.id);
    setSelectedItem(null);
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size}장을 삭제하시겠어요?`)) return;
    onDelete([...selected]);
    setSelected(new Set());
    setSelectMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <>
      <div className="gal">
        <div className="gal__grain" />

        <div className="gal__header">
          <div className="gal__header-left">
            <div className="gal__back-btn" onClick={onClose}>
              ← 카메라
            </div>
          </div>
          <div className="gal__header-center">
            <span className="gal__title">Gallery</span>
            <span className="gal__subtitle">Your moment, captured Today</span>
          </div>
          <button
            className="gal__select-btn"
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
          >
            {selectMode ? "취소" : "선택"}
          </button>
        </div>

        <div className="gal__scroll">
          {[...grouped.entries()].map(([date, items]) => (
            <div key={date} className="gal__group">
              <div className="gal__group-date">{date}</div>
              <div className="gal__grid3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={`gal__thumb ${selected.has(item.id) ? "gal__thumb--sel" : ""}`}
                    onClick={() => {
                      if (selectMode) toggleSelect(item.id);
                      else setSelectedItem(item);
                    }}
                  >
                    <img src={item.url} alt="" />
                    {selected.has(item.id) && (
                      <div className="gal__thumb-check">✓</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {photoCount === 0 && (
            <div className="gal__empty">
              <p>📷</p>
              <p>아직 촬영된 사진이 없어요</p>
            </div>
          )}
        </div>

        {selectMode && (
          <div className="gal__bulk-bar">
            <span>{selected.size}장 선택됨</span>
            <button
              className="gal__bulk-del"
              disabled={selected.size === 0}
              onClick={handleBulkDelete}
            >
              삭제
            </button>
          </div>
        )}

        <div className="gal__bottom-nav">
          <span className="gal__nav-back" onClick={onClose}>
            ← 카메라
          </span>
          <span className="gal__nav-logo">re-mon</span>
          <span className="gal__nav-count">{photoCount} moments</span>
        </div>
      </div>

      {selectedItem && (
        <div className="lb__overlay" onClick={() => setSelectedItem(null)}>
          <div className="lb__box" onClick={(e) => e.stopPropagation()}>
            <button className="lb__close" onClick={() => setSelectedItem(null)}>
              <CloseIcon />
            </button>

            <div className="lb__media">
              <img src={selectedItem.url} alt="detail" />
            </div>

            <div className="lb__actions">
              <div className="lb__actions-meta">
                {fmtDate(selectedItem.capturedAt)} ·{" "}
                {fmtTime(selectedItem.capturedAt)}
              </div>
              <div className="lb__actions-btns">
                <button
                  className="lb__btn lb__btn--save"
                  onClick={() => handleDownload(selectedItem)}
                >
                  <DownloadIcon />
                  <span>저장</span>
                </button>
                <button
                  className="lb__btn lb__btn--delete"
                  onClick={() => handleDelete(selectedItem)}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFrame && (
        <FrameStudio captures={captures} onClose={() => setShowFrame(false)} />
      )}
    </>
  );
};

export default Gallery;
