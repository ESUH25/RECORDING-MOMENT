import { useState } from "react";
import type { BeautyParams } from "../Facebeautyengine";
import "./FaceBeautyPanel.css";

interface Props {
  params: BeautyParams;
  onChange: (p: BeautyParams) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const CATS = [
  { id: "ratio", label: "비율" },
  { id: "face", label: "얼굴형" },
  { id: "eye", label: "눈" },
  { id: "lip", label: "입술" },
  { id: "nose", label: "코" },
  { id: "brow", label: "눈썹" },
  { id: "skin", label: "피부" },
] as const;
type CatId = (typeof CATS)[number]["id"];

type ControlDef = {
  key: keyof BeautyParams;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
};

const CONTROLS: Record<CatId, ControlDef[]> = {
  ratio: [
    { key: "ratio", label: "비율", icon: "⊡", min: -100, max: 100, step: 1 },
  ],
  face: [
    {
      key: "faceWidth",
      label: "얼굴 너비",
      icon: "◁▷",
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "faceShrink",
      label: "줄이기",
      icon: "○",
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "faceContour",
      label: "오토 윤곽",
      icon: "◡",
      min: 0,
      max: 100,
      step: 1,
    },
  ],
  eye: [
    { key: "eyeSize", label: "크기", icon: "👁", min: 0, max: 100, step: 1 },
    {
      key: "eyeDistance",
      label: "간격",
      icon: "↔",
      min: -100,
      max: 100,
      step: 1,
    },
    {
      key: "eyeHeight",
      label: "높이",
      icon: "↕",
      min: -100,
      max: 100,
      step: 1,
    },
    { key: "eyeAngle", label: "각도", icon: "∠", min: -100, max: 100, step: 1 },
  ],
  lip: [
    {
      key: "lipThickness",
      label: "두께",
      icon: "💋",
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "lipHeight",
      label: "높이",
      icon: "↕",
      min: -100,
      max: 100,
      step: 1,
    },
    { key: "lipAngle", label: "각도", icon: "∠", min: -100, max: 100, step: 1 },
    { key: "lipSmile", label: "미소", icon: "🙂", min: 0, max: 100, step: 1 },
  ],
  nose: [
    { key: "noseSize", label: "크기", icon: "○", min: -100, max: 100, step: 1 },
    {
      key: "noseWidth",
      label: "콧볼",
      icon: "↔",
      min: -100,
      max: 100,
      step: 1,
    },
    {
      key: "noseHeight",
      label: "높이",
      icon: "↕",
      min: -100,
      max: 100,
      step: 1,
    },
  ],
  brow: [
    {
      key: "browThickness",
      label: "두께",
      icon: "━",
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "browDistance",
      label: "간격",
      icon: "↔",
      min: -100,
      max: 100,
      step: 1,
    },
    {
      key: "browHeight",
      label: "높이",
      icon: "↕",
      min: -100,
      max: 100,
      step: 1,
    },
    {
      key: "browAngle",
      label: "각도",
      icon: "∠",
      min: -100,
      max: 100,
      step: 1,
    },
  ],
  skin: [
    {
      key: "skinSmooth",
      label: "피부 보정",
      icon: "✨",
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "skinBrighten",
      label: "밝기",
      icon: "☀️",
      min: 0,
      max: 100,
      step: 1,
    },
    { key: "skinRuddy", label: "혈색", icon: "🌸", min: 0, max: 100, step: 1 },
  ],
};

function hasEffect(params: BeautyParams, cat: CatId): boolean {
  return CONTROLS[cat].some((c) => params[c.key] !== 0);
}

export default function FaceBeautyPanel({
  params,
  onChange,
  onClose,
  onConfirm,
}: Props) {
  const [cat, setCat] = useState<CatId>("face");
  const [activeSub, setActiveSub] = useState<keyof BeautyParams>(
    CONTROLS["face"][0].key,
  );

  const set = (key: keyof BeautyParams, val: number) =>
    onChange({ ...params, [key]: val });

  const reset = () => {
    const zero = { ...params };

    CONTROLS[cat].forEach((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zero as any)[c.key] = 0;
    });
    onChange(zero);
  };

  const currentControls = CONTROLS[cat];
  const activeDef =
    currentControls.find((c) => c.key === activeSub) ?? currentControls[0];
  const currentVal = params[activeDef.key] as number;
  const isBipolar = activeDef.min < 0;

  const handleCatChange = (c: CatId) => {
    setCat(c);
    setActiveSub(CONTROLS[c][0].key);
  };

  return (
    <div className="fbp">
      <div className="fbp__topbar">
        <button className="fbp__cancel" onClick={onClose} type="button">
          ✕
        </button>
        <span className="fbp__title">뷰티</span>
        <button className="fbp__confirm" onClick={onConfirm} type="button">
          ✓
        </button>
      </div>

      <div className="fbp__sub-scroll">
        {currentControls.map((ctrl) => {
          const isOn = params[ctrl.key] !== 0;
          const isAct = ctrl.key === activeSub;
          return (
            <button
              key={ctrl.key}
              className={`fbp__sub-item ${isAct ? "fbp__sub-item--on" : ""}`}
              onClick={() => setActiveSub(ctrl.key)}
              type="button"
            >
              <div
                className={`fbp__sub-icon ${isOn ? "fbp__sub-icon--active" : ""}`}
              >
                <span>{ctrl.icon}</span>
                {isOn && <span className="fbp__sub-dot" />}
              </div>
              <span className="fbp__sub-label">{ctrl.label}</span>
            </button>
          );
        })}
      </div>

      <div className="fbp__slider-area">
        <div className="fbp__slider-header">
          <span className="fbp__slider-name">{activeDef.label}</span>
          <div className="fbp__slider-actions">
            {hasEffect(params, cat) && (
              <button className="fbp__reset-cat" onClick={reset} type="button">
                초기화
              </button>
            )}
            <span className="fbp__slider-val">
              {isBipolar
                ? currentVal > 0
                  ? `+${currentVal}`
                  : currentVal
                : currentVal}
            </span>
          </div>
        </div>

        <div className="fbp__slider-wrap">
          {isBipolar && <div className="fbp__slider-center-line" />}
          <input
            type="range"
            className={`fbp__slider ${isBipolar ? "fbp__slider--bipolar" : ""}`}
            min={activeDef.min}
            max={activeDef.max}
            step={activeDef.step}
            value={currentVal}
            onChange={(e) => set(activeDef.key, Number(e.target.value))}
          />
        </div>
      </div>

      <div className="fbp__cats">
        {CATS.map((c) => {
          const isOn = hasEffect(params, c.id);
          const isAct = c.id === cat;
          return (
            <button
              key={c.id}
              className={`fbp__cat ${isAct ? "fbp__cat--on" : ""}`}
              onClick={() => handleCatChange(c.id)}
              type="button"
            >
              {c.label}
              {isOn && <span className="fbp__cat-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
