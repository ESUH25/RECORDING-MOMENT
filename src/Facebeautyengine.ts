interface FaceMeshOptions {
  locateFile: (file: string) => string;
}

interface FaceMeshInstance {
  setOptions(options: {
    maxNumFaces: number;
    refineLandmarks: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }): void;
  onResults(
    callback: (results: {
      multiFaceLandmarks?: { x: number; y: number; z?: number }[][];
    }) => void,
  ): void;
  initialize(): Promise<void>;
  send(data: { image: HTMLVideoElement }): Promise<void>;
  close?(): void;
}

interface FaceMeshConstructor {
  new (options: FaceMeshOptions): FaceMeshInstance;
}

declare global {
  interface Window {
    FaceMesh?: FaceMeshConstructor;
  }
}

export interface BeautyParams {
  ratio: number;
  faceWidth: number;
  faceShrink: number;
  faceContour: number;
  eyeSize: number;
  eyeDistance: number;
  eyeHeight: number;
  eyeAngle: number;
  lipThickness: number;
  lipHeight: number;
  lipAngle: number;
  lipSmile: number;
  noseSize: number;
  noseWidth: number;
  noseHeight: number;
  browThickness: number;
  browDistance: number;
  browHeight: number;
  browAngle: number;
  skinSmooth: number;
  skinBrighten: number;
  skinRuddy: number;
}

export const DEFAULT_BEAUTY: BeautyParams = {
  ratio: 0,
  faceWidth: 0,
  faceShrink: 0,
  faceContour: 0,
  eyeSize: 0,
  eyeDistance: 0,
  eyeHeight: 0,
  eyeAngle: 0,
  lipThickness: 0,
  lipHeight: 0,
  lipAngle: 0,
  lipSmile: 0,
  noseSize: 0,
  noseWidth: 0,
  noseHeight: 0,
  browThickness: 0,
  browDistance: 0,
  browHeight: 0,
  browAngle: 0,
  skinSmooth: 0,
  skinBrighten: 0,
  skinRuddy: 0,
};

const LM = {
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  CHIN: 152,
  FOREHEAD: 10,
  LEFT_JAW: 172,
  RIGHT_JAW: 397,
  LEFT_TEMPLE: 162,
  RIGHT_TEMPLE: 389,
  L_EYE_OUT: 33,
  L_EYE_IN: 133,
  L_EYE_TOP: 159,
  L_EYE_BOT: 145,
  R_EYE_OUT: 362,
  R_EYE_IN: 263,
  R_EYE_TOP: 386,
  R_EYE_BOT: 374,
  NOSE_TIP: 4,
  NOSE_L: 129,
  NOSE_R: 358,
  LIP_TOP: 0,
  LIP_BOT: 17,
  LIP_LEFT: 61,
  LIP_RIGHT: 291,
  LIP_CTR_TOP: 13,
  LIP_L_COR: 61,
  L_BROW_IN: 55,
  L_BROW_OUT: 46,
  L_BROW_TOP: 52,
  L_BROW_BOT: 66,
  R_BROW_IN: 285,
  R_BROW_OUT: 276,
  R_BROW_TOP: 282,
  R_BROW_BOT: 296,
} as const;

const FACE_OVAL: number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109, 10,
];

type LM3 = { x: number; y: number; z?: number };
interface FaceMeshResults {
  multiFaceLandmarks?: LM3[][];
}

export class FaceBeautyEngine {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private faceMesh: FaceMeshInstance | null = null;
  private isRunning = false;
  private landmarks: LM3[] | null = null;
  private params: BeautyParams;
  private rafId: number | null = null;
  private onReady?: () => void;
  private faceDetected = false;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  constructor(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    params: BeautyParams,
    onReady?: () => void,
  ) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.params = { ...params };
    this.onReady = onReady;
    this.offscreen = document.createElement("canvas");
    this.offCtx = this.offscreen.getContext("2d")!;
  }

  updateParams(params: BeautyParams): void {
    this.params = { ...params };
  }

  isFaceDetected(): boolean {
    return this.faceDetected;
  }

  async init(): Promise<void> {
    await this.loadScript(
      "mp-face-mesh",
      "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js",
    );
    await this.setupMesh();
  }

  private loadScript(id: string, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.id = id;
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Script load failed: ${src}`));
      document.head.appendChild(s);
    });
  }

  private async setupMesh(): Promise<void> {
    const FM = window.FaceMesh;
    if (!FM) throw new Error("FaceMesh not available");

    this.faceMesh = new FM({
      locateFile: (f: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`,
    });

    this.getMesh().setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.getMesh().onResults((results: FaceMeshResults) => {
      if (results.multiFaceLandmarks?.length) {
        this.landmarks = results.multiFaceLandmarks[0];
        this.faceDetected = true;
      } else {
        this.landmarks = null;
        this.faceDetected = false;
      }
    });

    await this.getMesh().initialize();
    this.onReady?.();
  }

  private getMesh(): FaceMeshInstance {
    return this.faceMesh as FaceMeshInstance;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private loop = async (): Promise<void> => {
    if (!this.isRunning) return;
    const v = this.video;
    if (v.readyState >= 2) {
      if (this.canvas.width !== v.videoWidth) this.canvas.width = v.videoWidth;
      if (this.canvas.height !== v.videoHeight)
        this.canvas.height = v.videoHeight;
      if (this.offscreen.width !== v.videoWidth)
        this.offscreen.width = v.videoWidth;
      if (this.offscreen.height !== v.videoHeight)
        this.offscreen.height = v.videoHeight;
      try {
        await this.getMesh().send({ image: v });
      } catch {
        /**/
      }
      this.draw();
    }
    this.rafId = requestAnimationFrame(() => {
      void this.loop();
    });
  };

  private draw(): void {
    const { ctx, canvas: c, video: v, params: p, landmarks: lms } = this;
    const W = c.width,
      H = c.height;
    const mirrored = v.style.transform?.includes("scaleX(-1)");

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (mirrored) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, W, H);
    ctx.restore();

    if (p.skinSmooth > 0 || p.skinBrighten > 0 || p.skinRuddy > 0) {
      this.applySkin(lms, W, H, p);
    }

    if (!lms) return;

    this.offCtx.clearRect(0, 0, W, H);
    this.offCtx.drawImage(c, 0, 0);

    if (p.faceWidth > 0) this.warpFaceWidth(lms, W, H, p.faceWidth / 100);
    if (p.faceShrink > 0) this.warpFaceShrink(lms, W, H, p.faceShrink / 100);
    if (p.faceContour > 0) this.warpFaceContour(lms, W, H, p.faceContour / 100);

    if (p.eyeSize > 0) this.warpEyes(lms, W, H, p.eyeSize / 100);
    if (p.eyeDistance !== 0)
      this.warpEyeDistance(lms, W, H, p.eyeDistance / 100);
    if (p.eyeHeight !== 0) this.warpEyeHeight(lms, W, H, p.eyeHeight / 100);

    if (p.noseWidth !== 0) this.warpNoseWidth(lms, W, H, p.noseWidth / 100);
    if (p.noseSize !== 0) this.warpNoseSize(lms, W, H, p.noseSize / 100);

    if (p.lipThickness > 0) this.warpLip(lms, W, H, p.lipThickness / 100);
    if (p.lipSmile > 0) this.warpLipSmile(lms, W, H, p.lipSmile / 100);

    if (p.browThickness > 0) this.warpBrows(lms, W, H, p.browThickness / 100);
    if (p.browHeight !== 0) this.warpBrowHeight(lms, W, H, p.browHeight / 100);
  }

  private applySkin(
    lms: LM3[] | null,
    W: number,
    H: number,
    p: BeautyParams,
  ): void {
    const hasLms = !!lms;

    if (p.skinSmooth > 0) {
      const blur = Math.round((p.skinSmooth / 100) * 12);
      if (blur > 0) {
        this.ctx.save();
        if (hasLms) this.clipFace(lms!, W, H);
        this.ctx.filter = `blur(${blur}px)`;
        this.ctx.globalAlpha = 0.72;
        this.ctx.drawImage(this.video, 0, 0, W, H);
        this.ctx.filter = "none";
        this.ctx.globalAlpha = 1;
        this.ctx.restore();
      }
    }

    if (p.skinBrighten > 0) {
      const alpha = (p.skinBrighten / 100) * 0.38;
      this.ctx.save();
      if (hasLms) this.clipFace(lms!, W, H);
      this.ctx.fillStyle = `rgba(255,240,220,${alpha})`;
      this.ctx.fillRect(0, 0, W, H);
      this.ctx.restore();
    }

    if (p.skinRuddy > 0) {
      if (!hasLms) return;
      const cheekR =
        Math.abs(lms![LM.RIGHT_CHEEK].x - lms![LM.LEFT_CHEEK].x) * W * 0.2;
      const cheeks = [
        { cx: lms![LM.LEFT_CHEEK].x * W, cy: lms![LM.LEFT_CHEEK].y * H },
        { cx: lms![LM.RIGHT_CHEEK].x * W, cy: lms![LM.RIGHT_CHEEK].y * H },
      ];
      this.ctx.save();
      cheeks.forEach(({ cx, cy }) => {
        const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, cheekR);
        g.addColorStop(0, `rgba(240,100,100,${(p.skinRuddy / 100) * 0.5})`);
        g.addColorStop(0.5, `rgba(240,100,100,${(p.skinRuddy / 100) * 0.2})`);
        g.addColorStop(1, "rgba(240,100,100,0)");
        this.ctx.fillStyle = g;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, cheekR, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.restore();
    }
  }

  private clipFace(lms: LM3[], W: number, H: number): void {
    this.ctx.beginPath();
    FACE_OVAL.forEach((idx, i) => {
      const x = lms[idx].x * W,
        y = lms[idx].y * H;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.closePath();
    this.ctx.clip();
  }

  private warpFaceWidth(lms: LM3[], W: number, H: number, t: number): void {
    const noseCx = lms[LM.NOSE_TIP].x * W;
    const faceW = Math.abs(lms[LM.RIGHT_CHEEK].x - lms[LM.LEFT_CHEEK].x) * W;
    const faceH = Math.abs(lms[LM.FOREHEAD].y - lms[LM.CHIN].y) * H;
    const str = t * 0.22 * faceW; // 0.09 → 0.22
    const rad = faceH * 0.6;
    this.liquidWarp(
      lms[LM.LEFT_CHEEK].x * W,
      lms[LM.LEFT_CHEEK].y * H,
      noseCx,
      lms[LM.LEFT_CHEEK].y * H,
      str,
      rad,
    );
    this.liquidWarp(
      lms[LM.RIGHT_CHEEK].x * W,
      lms[LM.RIGHT_CHEEK].y * H,
      noseCx,
      lms[LM.RIGHT_CHEEK].y * H,
      str,
      rad,
    );
    this.liquidWarp(
      lms[LM.LEFT_JAW].x * W,
      lms[LM.LEFT_JAW].y * H,
      noseCx,
      lms[LM.LEFT_JAW].y * H,
      str * 0.6,
      rad * 0.7,
    );
    this.liquidWarp(
      lms[LM.RIGHT_JAW].x * W,
      lms[LM.RIGHT_JAW].y * H,
      noseCx,
      lms[LM.RIGHT_JAW].y * H,
      str * 0.6,
      rad * 0.7,
    );
  }

  private warpFaceShrink(lms: LM3[], W: number, H: number, t: number): void {
    const cx = ((lms[LM.LEFT_CHEEK].x + lms[LM.RIGHT_CHEEK].x) / 2) * W;
    const cy = lms[LM.NOSE_TIP].y * H;
    const fW = Math.abs(lms[LM.RIGHT_CHEEK].x - lms[LM.LEFT_CHEEK].x) * W;
    const str = t * 0.18 * fW;
    const rad = fW * 0.85;
    (
      [
        LM.LEFT_CHEEK,
        LM.RIGHT_CHEEK,
        LM.LEFT_JAW,
        LM.RIGHT_JAW,
        LM.LEFT_TEMPLE,
        LM.RIGHT_TEMPLE,
      ] as number[]
    ).forEach((idx) =>
      this.liquidWarp(lms[idx].x * W, lms[idx].y * H, cx, cy, str, rad),
    );
  }

  private warpFaceContour(lms: LM3[], W: number, H: number, t: number): void {
    const chinX = lms[LM.CHIN].x * W;
    const chinY = lms[LM.CHIN].y * H;
    const faceH = Math.abs(lms[LM.FOREHEAD].y - lms[LM.CHIN].y) * H;
    const str = t * 0.16 * faceH;
    const rad = faceH * 0.4;
    this.liquidWarp(
      lms[LM.LEFT_JAW].x * W,
      lms[LM.LEFT_JAW].y * H,
      chinX,
      chinY,
      str,
      rad,
    );
    this.liquidWarp(
      lms[LM.RIGHT_JAW].x * W,
      lms[LM.RIGHT_JAW].y * H,
      chinX,
      chinY,
      str,
      rad,
    );
  }

  private warpEyes(lms: LM3[], W: number, H: number, size: number): void {
    const scale = 1 + size * 0.55;
    const faceW = Math.abs(lms[LM.RIGHT_CHEEK].x - lms[LM.LEFT_CHEEK].x) * W;
    const radius = faceW * 0.16;
    [
      {
        cx: ((lms[LM.L_EYE_OUT].x + lms[LM.L_EYE_IN].x) / 2) * W,
        cy: ((lms[LM.L_EYE_TOP].y + lms[LM.L_EYE_BOT].y) / 2) * H,
      },
      {
        cx: ((lms[LM.R_EYE_OUT].x + lms[LM.R_EYE_IN].x) / 2) * W,
        cy: ((lms[LM.R_EYE_TOP].y + lms[LM.R_EYE_BOT].y) / 2) * H,
      },
    ].forEach(({ cx, cy }) => this.radialExpand(cx, cy, radius, scale));
  }

  private warpEyeDistance(lms: LM3[], W: number, H: number, t: number): void {
    const faceW = Math.abs(lms[LM.RIGHT_CHEEK].x - lms[LM.LEFT_CHEEK].x) * W;
    const move = t * 0.1 * faceW;
    const rad = faceW * 0.18;
    const noseCx = lms[LM.NOSE_TIP].x * W;
    const lEyeCx = ((lms[LM.L_EYE_OUT].x + lms[LM.L_EYE_IN].x) / 2) * W;
    const rEyeCx = ((lms[LM.R_EYE_OUT].x + lms[LM.R_EYE_IN].x) / 2) * W;
    const lEyeCy = ((lms[LM.L_EYE_TOP].y + lms[LM.L_EYE_BOT].y) / 2) * H;
    const rEyeCy = ((lms[LM.R_EYE_TOP].y + lms[LM.R_EYE_BOT].y) / 2) * H;
    this.liquidWarp(lEyeCx, lEyeCy, noseCx, lEyeCy, Math.abs(move), rad);
    this.liquidWarp(rEyeCx, rEyeCy, noseCx, rEyeCy, Math.abs(move), rad);
  }

  private warpEyeHeight(lms: LM3[], W: number, H: number, t: number): void {
    const faceH = Math.abs(lms[LM.FOREHEAD].y - lms[LM.CHIN].y) * H;
    const move = t * 0.055 * faceH;
    const rad = faceH * 0.14;
    const noseCy = lms[LM.NOSE_TIP].y * H;
    [
      {
        cx: ((lms[LM.L_EYE_OUT].x + lms[LM.L_EYE_IN].x) / 2) * W,
        cy: ((lms[LM.L_EYE_TOP].y + lms[LM.L_EYE_BOT].y) / 2) * H,
      },
      {
        cx: ((lms[LM.R_EYE_OUT].x + lms[LM.R_EYE_IN].x) / 2) * W,
        cy: ((lms[LM.R_EYE_TOP].y + lms[LM.R_EYE_BOT].y) / 2) * H,
      },
    ].forEach(({ cx, cy }) =>
      this.liquidWarp(cx, cy, cx, noseCy, Math.abs(move), rad),
    );
  }

  private warpNoseWidth(lms: LM3[], W: number, H: number, t: number): void {
    const noseCx = lms[LM.NOSE_TIP].x * W;
    const noseCy = lms[LM.NOSE_TIP].y * H;
    const faceW = Math.abs(lms[LM.RIGHT_CHEEK].x - lms[LM.LEFT_CHEEK].x) * W;
    const str = Math.abs(t) * 0.1 * faceW; // 0.04 → 0.1
    const rad = faceW * 0.15;
    const dir = t < 0 ? 1 : -1;
    this.liquidWarp(
      lms[LM.NOSE_L].x * W,
      noseCy,
      noseCx,
      noseCy,
      str * dir,
      rad,
    );
    this.liquidWarp(
      lms[LM.NOSE_R].x * W,
      noseCy,
      noseCx,
      noseCy,
      str * dir,
      rad,
    );
  }

  private warpNoseSize(lms: LM3[], W: number, H: number, t: number): void {
    const noseCx = lms[LM.NOSE_TIP].x * W;
    const noseCy = lms[LM.NOSE_TIP].y * H;
    const faceW = Math.abs(lms[LM.RIGHT_CHEEK].x - lms[LM.LEFT_CHEEK].x) * W;
    const scale = t < 0 ? 1 - Math.abs(t) * 0.45 : 1 + t * 0.45; // 0.3 → 0.45
    const rad = faceW * 0.14;
    this.radialExpand(noseCx, noseCy, rad, scale);
  }

  private warpLip(lms: LM3[], W: number, H: number, thick: number): void {
    const topY = lms[LM.LIP_TOP].y * H;
    const botY = lms[LM.LIP_BOT].y * H;
    const lipCx = lms[LM.LIP_CTR_TOP].x * W;
    const faceW = Math.abs(lms[LM.RIGHT_CHEEK].x - lms[LM.LEFT_CHEEK].x) * W;
    const move = thick * 0.045 * faceW; // 0.018 → 0.045
    const rad = faceW * 0.15;
    this.liquidWarp(lipCx, topY, lipCx, topY - move, move, rad);
    this.liquidWarp(lipCx, botY, lipCx, botY + move, move, rad);
  }

  private warpLipSmile(lms: LM3[], W: number, H: number, t: number): void {
    const faceH = Math.abs(lms[LM.FOREHEAD].y - lms[LM.CHIN].y) * H;
    const move = t * 0.035 * faceH; // 0.015 → 0.035
    const rad = faceH * 0.1;
    const upY = lms[LM.LIP_L_COR].y * H - move;
    this.liquidWarp(
      lms[LM.LIP_LEFT].x * W,
      lms[LM.LIP_LEFT].y * H,
      lms[LM.LIP_LEFT].x * W,
      upY,
      move,
      rad,
    );
    this.liquidWarp(
      lms[LM.LIP_RIGHT].x * W,
      lms[LM.LIP_RIGHT].y * H,
      lms[LM.LIP_RIGHT].x * W,
      upY,
      move,
      rad,
    );
  }

  private warpBrows(lms: LM3[], W: number, H: number, thick: number): void {
    const faceW = Math.abs(lms[LM.RIGHT_CHEEK].x - lms[LM.LEFT_CHEEK].x) * W;
    const move = thick * 0.03 * faceW; // 0.012 → 0.03
    const rad = faceW * 0.13;
    [
      {
        cx: ((lms[LM.L_BROW_IN].x + lms[LM.L_BROW_OUT].x) / 2) * W,
        top: lms[LM.L_BROW_TOP].y * H,
      },
      {
        cx: ((lms[LM.R_BROW_IN].x + lms[LM.R_BROW_OUT].x) / 2) * W,
        top: lms[LM.R_BROW_TOP].y * H,
      },
    ].forEach(({ cx, top }) =>
      this.liquidWarp(cx, top, cx, top - move, move, rad),
    );
  }

  private warpBrowHeight(lms: LM3[], W: number, H: number, t: number): void {
    const faceH = Math.abs(lms[LM.FOREHEAD].y - lms[LM.CHIN].y) * H;
    const move = t * 0.055 * faceH; // 0.025 → 0.055
    const rad = faceH * 0.12;
    const eyeY = ((lms[LM.L_EYE_TOP].y + lms[LM.R_EYE_TOP].y) / 2) * H;
    [
      {
        cx: ((lms[LM.L_BROW_IN].x + lms[LM.L_BROW_OUT].x) / 2) * W,
        cy: ((lms[LM.L_BROW_TOP].y + lms[LM.L_BROW_BOT].y) / 2) * H,
      },
      {
        cx: ((lms[LM.R_BROW_IN].x + lms[LM.R_BROW_OUT].x) / 2) * W,
        cy: ((lms[LM.R_BROW_TOP].y + lms[LM.R_BROW_BOT].y) / 2) * H,
      },
    ].forEach(({ cx, cy }) =>
      this.liquidWarp(cx, cy, cx, eyeY, Math.abs(move), rad),
    );
  }

  private radialExpand(
    cx: number,
    cy: number,
    radius: number,
    scale: number,
  ): void {
    const r = Math.ceil(radius);
    const x0 = Math.round(cx - r),
      y0 = Math.round(cy - r);
    const sz = r * 2;
    if (
      sz <= 0 ||
      x0 < 0 ||
      y0 < 0 ||
      x0 + sz > this.canvas.width ||
      y0 + sz > this.canvas.height
    )
      return;
    try {
      const srcId = this.offCtx.getImageData(x0, y0, sz, sz);
      const dstId = this.ctx.getImageData(x0, y0, sz, sz);
      const src = srcId.data,
        dst = dstId.data;
      for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
          const dx = x - r,
            dy = y - r;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= r) continue;
          const falloff = 1 - d / r;
          const eff = 1 + (scale - 1) * falloff * falloff;
          const sx = Math.round(r + dx / eff);
          const sy = Math.round(r + dy / eff);
          if (sx < 0 || sx >= sz || sy < 0 || sy >= sz) continue;
          const di = (y * sz + x) * 4,
            si = (sy * sz + sx) * 4;
          dst[di] = src[si];
          dst[di + 1] = src[si + 1];
          dst[di + 2] = src[si + 2];
          dst[di + 3] = src[si + 3];
        }
      }
      this.ctx.putImageData(dstId, x0, y0);
    } catch {
      /* */
    }
  }

  private liquidWarp(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    strength: number,
    radius: number,
  ): void {
    const r = Math.ceil(radius);
    const x0 = Math.round(sx - r),
      y0 = Math.round(sy - r);
    const sz = r * 2;
    if (
      sz <= 0 ||
      x0 < 0 ||
      y0 < 0 ||
      x0 + sz > this.canvas.width ||
      y0 + sz > this.canvas.height
    )
      return;
    const ddx = tx - sx,
      ddy = ty - sy;
    try {
      const srcId = this.offCtx.getImageData(x0, y0, sz, sz);
      const dstId = this.ctx.getImageData(x0, y0, sz, sz);
      const src = srcId.data,
        dst = dstId.data;
      for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
          const px = x + x0,
            py = y + y0;
          const dx = px - sx,
            dy = py - sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= radius) continue;
          const f = Math.pow(1 - d / radius, 2);
          const wx = Math.round(x - (ddx / radius) * strength * f);
          const wy = Math.round(y - (ddy / radius) * strength * f);
          if (wx < 0 || wx >= sz || wy < 0 || wy >= sz) continue;
          const di = (y * sz + x) * 4,
            si = (wy * sz + wx) * 4;
          dst[di] = src[si];
          dst[di + 1] = src[si + 1];
          dst[di + 2] = src[si + 2];
          dst[di + 3] = src[si + 3];
        }
      }
      this.ctx.putImageData(dstId, x0, y0);
    } catch {
      /* */
    }
  }

  dispose(): void {
    this.stop();
    try {
      (this.faceMesh as { close?: () => void } | null)?.close?.();
    } catch {
      /* */
    }
    this.faceMesh = null;
  }
}
