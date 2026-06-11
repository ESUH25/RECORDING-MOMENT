import { useRef, useState, useEffect } from "react";
import {
  getFramesAsync,
  addFrameAsync,
  deleteFrameAsync,
  subscribeToFrames,
  loadOverlayImage,
  compressFrame,
} from "../store/framestore";
import type { ManagedFrame, PhotoInset } from "../store/framestore";
import "./AdminPanel.css";

const ADMIN_PIN = "1234";
const SESS_KEY = "remon__admin_ts";
const SESS_TTL = 30 * 60 * 1000;

const sessOk = () => {
  try {
    const r = sessionStorage.getItem(SESS_KEY);
    return r ? Date.now() - Number(r) < SESS_TTL : false;
  } catch {
    return false;
  }
};
const sessSave = () => {
  try {
    sessionStorage.setItem(SESS_KEY, String(Date.now()));
  } catch {
    /**/
  }
};
const sessClear = () => {
  try {
    sessionStorage.removeItem(SESS_KEY);
  } catch {
    /**/
  }
};

const D_INSET: PhotoInset = { top: 0, right: 0, bottom: 0, left: 0 };
const THUMB = 80,
  PREV = 220;

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (w <= 0 || h <= 0) return;
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
}

async function renderPreview(
  canvas: HTMLCanvasElement,
  photo: HTMLImageElement,
  frame: Pick<ManagedFrame, "overlayDataUrl" | "bgColor" | "inset">,
  size: number,
) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = frame.bgColor;
  ctx.fillRect(0, 0, size, size);
  const px = (frame.inset.left / 100) * size;
  const py = (frame.inset.top / 100) * size;
  const pw = size - px - (frame.inset.right / 100) * size;
  const ph = size - py - (frame.inset.bottom / 100) * size;
  drawCover(ctx, photo, px, py, Math.max(1, pw), Math.max(1, ph));
  if (frame.overlayDataUrl) {
    try {
      const ov = await loadOverlayImage(frame.overlayDataUrl);
      ctx.drawImage(ov, 0, 0, size, size);
    } catch {
      /* */
    }
  }
}

function FThumb({
  frame,
  photo,
}: {
  frame: ManagedFrame;
  photo: HTMLImageElement | null;
}) {
  const r = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (r.current && photo) void renderPreview(r.current, photo, frame, THUMB);
  }, [frame, photo]);
  return (
    <canvas
      ref={r}
      width={THUMB}
      height={THUMB}
      className="ap-thumb"
      style={{ pointerEvents: "none" }}
    />
  );
}

interface Props {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: Props) {
  const [authed, setAuthed] = useState(sessOk);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState(false);
  const [frames, setFrames] = useState<ManagedFrame[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [bg, setBg] = useState("#ffffff");
  const [inset, setInset] = useState<PhotoInset>(D_INSET);
  const [ovUrl, setOvUrl] = useState("");
  const [ovErr, setOvErr] = useState("");
  const [fileKB, setFileKB] = useState(0);
  const [numSlots, setNumSlots] = useState(1);
  const [aspect, setAspect] = useState(1.0);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const prevRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ph, setPh] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 300;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 300, 300);
    g.addColorStop(0, "#FFE066");
    g.addColorStop(0.5, "#4E86FF");
    g.addColorStop(1, "#FF8C69");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 300, 300);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("re-mon", 150, 150);
    const img = new Image();
    img.onload = () => setPh(img);
    img.src = c.toDataURL();
  }, []);

  const loadFrames = () => {
    setLoading(true);
    void getFramesAsync().then((f) => {
      setFrames(f);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!authed) return;

    const fetchFrames = async () => {
      await loadFrames();
    };

    fetchFrames();

    const unsubscribe = subscribeToFrames(loadFrames);
    return unsubscribe;
  }, [authed]);

  useEffect(() => {
    if (!prevRef.current || !ph || !authed) return;
    void renderPreview(
      prevRef.current,
      ph,
      { overlayDataUrl: ovUrl, bgColor: bg, inset },
      PREV,
    );
  }, [ovUrl, bg, inset, ph, authed]);

  const pinKey = (d: string) => {
    if (pin.length >= 4) return;
    const n = pin + d;
    setPin(n);
    setPinErr(false);
    if (n.length === 4) {
      if (n === ADMIN_PIN) {
        sessSave();
        setTimeout(() => setAuthed(true), 220);
      } else
        setTimeout(() => {
          setPinErr(true);
          setPin("");
        }, 320);
    }
  };
  const logout = () => {
    sessClear();
    setAuthed(false);
    setPin("");
    setPinErr(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setOvErr("이미지 파일만 가능합니다.");
      return;
    }
    setOvErr("");
    setFileKB(Math.round(f.size / 1024));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = (ev.target?.result as string) ?? "";
      setOvUrl(dataUrl);
      // PNG 원본 크기로 비율 자동 감지
      const img = new Image();
      img.onload = () => {
        const detectedAspect = img.naturalWidth / img.naturalHeight;
        setAspect(Math.round(detectedAspect * 1000) / 1000);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("프레임 이름을 입력해 주세요.");
      return;
    }
    if (!tag.trim()) {
      alert("태그를 입력해 주세요. (예: POL)");
      return;
    }
    if (!ovUrl) {
      alert("PNG 파일을 업로드해 주세요.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const compressed = await compressFrame(ovUrl, 800);
      await addFrameAsync({
        name: name.trim(),
        tag: tag.trim().toUpperCase().slice(0, 4),
        overlayDataUrl: compressed,
        bgColor: bg,
        inset,
        numSlots,
        aspect,
      });
      setMsg({
        ok: true,
        text: `✓ "${name.trim()}" ${numSlots}컷 프레임 추가 완료!`,
      });
      setName("");
      setTag("");
      setBg("#ffffff");
      setInset(D_INSET);
      setOvUrl("");
      setFileKB(0);
      setNumSlots(1);
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setMsg({ ok: false, text: "저장 실패: " + String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, n: string) => {
    if (!confirm(`"${n}" 프레임을 삭제하시겠습니까?`)) return;
    void deleteFrameAsync(id).catch((e) => alert("삭제 실패: " + String(e)));
  };

  if (!authed)
    return (
      <div className="ap ap--pin">
        <div className="ap__grain" />
        <div className="ap__pin-wrap">
          <span className="ap__logo">re-mon</span>
          <p className="ap__pin-title">Admin</p>
          <div className={`ap__dots ${pinErr ? "ap__dots--err" : ""}`}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`ap__dot ${i < pin.length ? "ap__dot--on" : ""}`}
              />
            ))}
          </div>
          {pinErr && <p className="ap__pin-err">PIN이 올바르지 않습니다</p>}
          <div className="ap__pin-grid">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
              (k, i) => (
                <button
                  key={i}
                  type="button"
                  className={`ap__key ${k === "" ? "ap__key--empty" : ""}`}
                  onClick={() =>
                    k === "⌫"
                      ? setPin((p) => p.slice(0, -1))
                      : k !== "" && pinKey(k)
                  }
                  disabled={k === ""}
                >
                  {k}
                </button>
              ),
            )}
          </div>
          <button type="button" className="ap__cancel" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    );

  return (
    <div className="ap">
      <div className="ap__grain" />
      <div className="ap__header">
        <div>
          <span className="ap__logo">re-mon</span>
          <span className="ap__header-sub">Frame Studio Admin</span>
        </div>
        <div className="ap__header-btns">
          <button
            type="button"
            className="ap__logout"
            onClick={logout}
            title="로그아웃"
          >
            ⏻
          </button>
          <button type="button" className="ap__close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="ap__body">
        <section className="ap__section">
          <h2 className="ap__sec-title">새 프레임 추가</h2>
          <div className="ap__form">
            <div
              className={`ap__upload ${ovUrl ? "ap__upload--filled" : ""}`}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFile}
              />
              {ovUrl ? (
                <>
                  <img
                    src={ovUrl}
                    className="ap__upload-img"
                    alt="overlay"
                    style={{ pointerEvents: "none" }}
                  />
                  <span className="ap__upload-change">탭하여 변경</span>
                </>
              ) : (
                <>
                  <p className="ap__upload-main">📂 PNG 프레임 이미지 업로드</p>
                  <p className="ap__upload-sub">투명 영역 → 사진 표시</p>
                  <p className="ap__upload-sub">자동 압축 · 용량 제한 없음</p>
                </>
              )}
            </div>
            {fileKB > 0 && (
              <p className="ap__file-info">
                📊 {fileKB} KB → 저장 시 자동 압축
              </p>
            )}
            {ovErr && <p className="ap__err">{ovErr}</p>}

            <div className="ap__row">
              <div className="ap__field ap__field--grow">
                <label className="ap__label">프레임 이름</label>
                <input
                  className="ap__input"
                  type="text"
                  placeholder="예: 폴라로이드"
                  maxLength={12}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="ap__field" style={{ width: 86 }}>
                <label className="ap__label">태그</label>
                <input
                  className="ap__input"
                  type="text"
                  placeholder="POL"
                  maxLength={4}
                  value={tag}
                  onChange={(e) =>
                    setTag(e.target.value.toUpperCase().slice(0, 4))
                  }
                />
              </div>
            </div>

            <div className="ap__field">
              <label className="ap__label">배경 색상</label>
              <div className="ap__color-row">
                <input
                  type="color"
                  className="ap__color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                />
                <span className="ap__color-val">{bg.toUpperCase()}</span>
                {["#ffffff", "#fffdf0", "#1a1a14", "#ffe033", "#4e86ff"].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      className={`ap__swatch ${bg.toLowerCase() === c ? "ap__swatch--on" : ""}`}
                      style={{ background: c }}
                      onClick={() => setBg(c)}
                    />
                  ),
                )}
              </div>
            </div>

            <div className="ap__field">
              <label className="ap__label">사진 인셋 (%)</label>
              {(["top", "right", "bottom", "left"] as (keyof PhotoInset)[]).map(
                (s) => (
                  <div key={s} className="ap__inset-row">
                    <span className="ap__inset-lbl">
                      {
                        {
                          top: "위",
                          right: "오른",
                          bottom: "아래",
                          left: "왼",
                        }[s]
                      }
                    </span>
                    <input
                      type="range"
                      className="ap__slider"
                      min={0}
                      max={50}
                      step={0.5}
                      value={inset[s]}
                      onChange={(e) =>
                        setInset((p) => ({ ...p, [s]: Number(e.target.value) }))
                      }
                    />
                    <span className="ap__inset-val">
                      {inset[s].toFixed(1)}%
                    </span>
                  </div>
                ),
              )}
            </div>

            <div className="ap__field">
              <label className="ap__label">슬롯 수 (사진 칸 개수)</label>
              <div className="ap__slots-row">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`ap__slot-btn ${numSlots === n ? "ap__slot-btn--on" : ""}`}
                    onClick={() => setNumSlots(n)}
                  >
                    {n}컷
                  </button>
                ))}
              </div>
              <p className="ap__slot-hint">
                {numSlots === 1 && "사진 1장 → PNG 투명 영역 전체에 배치"}
                {numSlots === 2 && "사진 2장 → 인셋 영역을 위/아래 절반씩 분할"}
                {numSlots === 3 && "사진 3장 → 인셋 영역을 세로 3등분 배치"}
                {numSlots === 4 && "사진 4장 → 인셋 영역을 2×2 그리드 배치"}
              </p>
            </div>

            <div className="ap__prev-row">
              <div>
                <p className="ap__prev-label">미리보기</p>
                <canvas
                  ref={prevRef}
                  width={PREV}
                  height={PREV}
                  className="ap__prev-canvas"
                  style={{ pointerEvents: "none" }}
                />
              </div>
              <button
                type="button"
                className={`ap__add-btn ${saving ? "ap__add-btn--loading" : ""}`}
                onClick={() => {
                  void handleSave();
                }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="ap__add-spin" />
                    저장 중...
                  </>
                ) : (
                  "프레임 추가"
                )}
              </button>
            </div>

            {msg && (
              <p
                className={`ap__save-msg ${msg.ok ? "ap__save-msg--ok" : "ap__save-msg--err"}`}
              >
                {msg.text}
              </p>
            )}
          </div>
        </section>

        <section className="ap__section">
          <h2 className="ap__sec-title">
            등록된 프레임 ({loading ? "…" : frames.length})
          </h2>
          {loading && <p className="ap__loading-txt">불러오는 중…</p>}
          {!loading && frames.length === 0 && (
            <p className="ap__empty">
              아직 프레임이 없습니다.
              <br />
              위에서 PNG를 업로드해 보세요.
            </p>
          )}
          {!loading && (
            <ul className="ap__list">
              {frames.map((f) => (
                <li key={f.id} className="ap__list-item">
                  <FThumb frame={f} photo={ph} />
                  <div className="ap__list-info">
                    <span className="ap__list-name">{f.name}</span>
                    <span className="ap__list-tag">{f.tag}</span>
                    <span className="ap__list-meta">
                      {f.numSlots ?? 1}컷 · T{f.inset.top} R{f.inset.right} B
                      {f.inset.bottom} L{f.inset.left}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ap__del-btn"
                    onClick={() => handleDelete(f.id, f.name)}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
