import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://gktbokgjupsikovoyvsw.supabase.co",
  "sb_publishable_cHlDhDPhpgQqmLwEsOo3ug_DrOSj2S-",
);

export interface PhotoInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ManagedFrame {
  id: string;
  name: string;
  tag: string;
  overlayDataUrl: string;
  bgColor: string;
  inset: PhotoInset;
  numSlots: number;
  slotInsets?: PhotoInset[];
  aspect: number;
  createdAt: number;
}

const CHANGE_EVT = "remon:frames-changed";

export function notifyFrameChange() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVT));
}

export function subscribeToFrames(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVT, cb);
  return () => window.removeEventListener(CHANGE_EVT, cb);
}

export async function getFramesAsync(): Promise<ManagedFrame[]> {
  try {
    const { data, error } = await supabase
      .from("frames")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      tag: row.tag,
      bgColor: row.bg_color,
      numSlots: row.num_slots,
      inset: {
        top: row.inset_top,
        right: row.inset_right,
        bottom: row.inset_bottom,
        left: row.inset_left,
      },
      overlayDataUrl: row.overlay_data_url ?? "",
      slotInsets: row.slot_insets ?? undefined,
      aspect: row.aspect ?? 1.0,
      createdAt: Number(row.created_at),
    }));
  } catch (e) {
    console.error("[framestore]", e);
    return [];
  }
}

export async function addFrameAsync(
  data: Omit<ManagedFrame, "id" | "createdAt">,
): Promise<ManagedFrame> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const { error } = await supabase.from("frames").insert({
    id,
    name: data.name,
    tag: data.tag,
    bg_color: data.bgColor,
    num_slots: data.numSlots ?? 1,
    inset_top: data.inset.top,
    inset_right: data.inset.right,
    inset_bottom: data.inset.bottom,
    inset_left: data.inset.left,
    overlay_data_url: data.overlayDataUrl ?? null,
    slot_insets: data.slotInsets ?? null,
    aspect: data.aspect ?? 1.0,
    created_at: now,
  });
  if (error) throw error;
  notifyFrameChange();
  return { ...data, id, createdAt: now };
}

export async function deleteFrameAsync(id: string): Promise<void> {
  const { error } = await supabase.from("frames").delete().eq("id", id);
  if (error) throw error;
  notifyFrameChange();
}

export function compressFrame(dataUrl: string, maxLong = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(
        maxLong / Math.max(img.naturalWidth, img.naturalHeight),
        1,
      );
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const imgCache = new Map<string, HTMLImageElement>();
export function loadOverlayImage(dataUrl: string): Promise<HTMLImageElement> {
  if (imgCache.has(dataUrl)) return Promise.resolve(imgCache.get(dataUrl)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imgCache.set(dataUrl, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
