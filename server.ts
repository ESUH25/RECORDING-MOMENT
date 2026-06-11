import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import { randomUUID } from "crypto";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20mb" }));

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASS ?? "1234@",
  database: process.env.DB_NAME ?? "remon",
  waitForConnections: true,
  connectionLimit: 10,
});

app.get("/api/frames", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM frames ORDER BY created_at DESC",
    );
    const frames = (rows as never[]).map(dbToFrame);
    res.json(frames);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/frames", async (req, res) => {
  try {
    const d = req.body;
    const id = randomUUID();
    const now = Date.now();
    await pool.query(
      `INSERT INTO frames
        (id, name, tag, bg_color, num_slots,
         inset_top, inset_right, inset_bottom, inset_left,
         overlay_data_url, slot_insets, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        d.name,
        d.tag,
        d.bgColor,
        d.numSlots ?? 1,
        d.inset?.top ?? 0,
        d.inset?.right ?? 0,
        d.inset?.bottom ?? 0,
        d.inset?.left ?? 0,
        d.overlayDataUrl ?? null,
        d.slotInsets ? JSON.stringify(d.slotInsets) : null,
        now,
      ],
    );
    res.json({ id, createdAt: now });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.delete("/api/frames/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM frames WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

interface FrameRow {
  id: string;
  name: string;
  tag: string;
  bg_color: string;
  num_slots: number;
  inset_top: number;
  inset_right: number;
  inset_bottom: number;
  inset_left: number;
  overlay_data_url: string | null;
  slot_insets: string | null;
  created_at: number;
}

function dbToFrame(row: FrameRow) {
  return {
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
    slotInsets: row.slot_insets ? JSON.parse(row.slot_insets) : undefined,
    createdAt: Number(row.created_at),
  };
}

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`✅ re-mon API server running on http://localhost:${PORT}`);
});
