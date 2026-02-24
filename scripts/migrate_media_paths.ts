/* scripts/migrate_media_paths.ts
 *
 * Objetivo:
 * - Backfill de DB: cafes.image_path y promotions.image_path usando convención:
 *   cafes:      media/cafes/C-XX.png  (XX = image_code 2 dígitos, ej. C-01.png)
 *   promotions: media/promos/P-001.<ext> (secuencial por created_at)
 *
 * ARCHIVOS GENERADOS:
 *   - scripts/_media_migration_report.json
 *   - scripts/_media_moves.sh  (si no usaste --no-moves)
 *
 * INSTRUCCIONES DE USO (TERMINAL):
 *   1) npm i @supabase/supabase-js
 *   2) export SUPABASE_URL="(tu url)"   # o usa NEXT_PUBLIC_SUPABASE_URL
 *   3) export SUPABASE_SERVICE_ROLE_KEY="(service role key)"
 *   4) node scripts/migrate_media_paths.ts --dry-run
 *   5) node scripts/migrate_media_paths.ts --apply
 *   6) bash scripts/_media_moves.sh    # opcional, si tus image_url apuntaban a paths locales
 *
 * Flags:
 *   --dry-run   no escribe en DB (default)
 *   --apply     aplica updates en DB
 *   --no-moves  no genera _media_moves.sh
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

type CafeRow = {
  id: string;
  name: string | null;
  image_code: string | null;
  image_url?: string | null;
  image_path?: string | null;
  created_at?: string | null;
};

type PromoRow = {
  id: string;
  title: string | null;
  image_url?: string | null;
  image_path?: string | null;
  created_at?: string | null;
};

function argHas(flag: string) {
  return process.argv.includes(flag);
}

const APPLY = argHas("--apply");
const DRY = argHas("--dry-run") || !APPLY;
const NO_MOVES = argHas("--no-moves");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Faltan env vars. Seteá SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function norm2(code: string) {
  const d = String(code ?? "").replace(/\D/g, "");
  return d.padStart(2, "0").slice(-2);
}

function guessExtFromUrl(url?: string | null): string {
  if (!url) return "png";
  const u = url.split("?")[0].trim();
  const ext = u.split(".").pop()?.toLowerCase();
  if (!ext) return "png";
  // whitelist
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "png";
}

function isLocalPublicPath(url?: string | null): boolean {
  if (!url) return false;
  const u = url.trim();
  return u.startsWith("/") || u.startsWith("media/") || u.startsWith("public/");
}

function toFsPathFromDbOrUrl(dbOrUrl: string): string | null {
  // Intentamos mapear a carpeta public/
  // - "media/..."  => public/media/...
  // - "/media/..." => public/media/...
  // - "public/..." => public/...
  // - "/..."       => public/...
  const s = dbOrUrl.trim();
  if (s.startsWith("http")) return null;

  if (s.startsWith("media/")) return path.join(process.cwd(), "public", s);
  if (s.startsWith("/media/")) return path.join(process.cwd(), "public", s.slice(1));
  if (s.startsWith("public/")) return path.join(process.cwd(), s);
  if (s.startsWith("/")) return path.join(process.cwd(), "public", s.slice(1));

  return null;
}

async function fetchCafes(): Promise<CafeRow[]> {
  const { data, error } = await supabase
    .from("cafes")
    .select("id,name,image_code,image_url,image_path,created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`fetchCafes: ${error.message}`);
  return (data ?? []) as CafeRow[];
}

async function fetchPromotions(): Promise<PromoRow[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("id,title,image_url,image_path,created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`fetchPromotions: ${error.message}`);
  return (data ?? []) as PromoRow[];
}

async function updateCafe(id: string, image_path: string) {
  const { error } = await supabase.from("cafes").update({ image_path }).eq("id", id);
  if (error) throw new Error(`updateCafe(${id}): ${error.message}`);
}

async function updatePromo(id: string, image_path: string) {
  const { error } = await supabase.from("promotions").update({ image_path }).eq("id", id);
  if (error) throw new Error(`updatePromo(${id}): ${error.message}`);
}

type MoveOp = { from: string; to: string; why: string };

(async () => {
  console.log(DRY ? "MODO: DRY-RUN (no escribe)" : "MODO: APPLY (escribe en DB)");

  const report: any = {
    at: new Date().toISOString(),
    mode: DRY ? "dry-run" : "apply",
    cafes: { total: 0, changed: 0, skipped: 0, rows: [] as any[] },
    promotions: { total: 0, changed: 0, skipped: 0, rows: [] as any[] },
    moves: [] as MoveOp[],
    notes: [],
  };

  // ===== CAFES =====
  const cafes = await fetchCafes();
  report.cafes.total = cafes.length;

  for (const c of cafes) {
    if (c.image_path && String(c.image_path).trim().length > 0) {
      report.cafes.skipped++;
      report.cafes.rows.push({
        id: c.id,
        name: c.name,
        status: "skipped_has_image_path",
        image_path: c.image_path,
      });
      continue;
    }

    const code2 = c.image_code ? norm2(c.image_code) : null;
    if (!code2) {
      report.cafes.skipped++;
      report.cafes.rows.push({
        id: c.id,
        name: c.name,
        status: "skipped_no_image_code",
        image_code: c.image_code,
        image_url: c.image_url ?? null,
      });
      continue;
    }

    // Convención pedida:
    const target = `media/cafes/C-${code2}.png`;

    if (!DRY) {
      await updateCafe(c.id, target);
    }
    report.cafes.changed++;
    report.cafes.rows.push({
      id: c.id,
      name: c.name,
      status: "updated",
      image_code: c.image_code,
      from_image_url: c.image_url ?? null,
      to_image_path: target,
    });

    // Moves sugeridos (si venía de image_url local)
    if (!NO_MOVES && isLocalPublicPath(c.image_url ?? null)) {
      const fromFs = toFsPathFromDbOrUrl(c.image_url!.trim());
      const toFs = toFsPathFromDbOrUrl("/" + target); // => public/media/...
      if (fromFs && toFs) {
        report.moves.push({
          from: fromFs,
          to: toFs,
          why: `Cafe ${c.name ?? c.id} (image_code=${code2})`,
        });
      }
    }
  }

  // ===== PROMOTIONS =====
  const promos = await fetchPromotions();
  report.promotions.total = promos.length;

  let promoSeq = 1;
  for (const p of promos) {
    if (p.image_path && String(p.image_path).trim().length > 0) {
      report.promotions.skipped++;
      report.promotions.rows.push({
        id: p.id,
        title: p.title,
        status: "skipped_has_image_path",
        image_path: p.image_path,
      });
      continue;
    }

    const ext = guessExtFromUrl(p.image_url ?? null);
    const code3 = pad3(promoSeq++);
    const target = `media/promos/P-${code3}.${ext}`;

    if (!DRY) {
      await updatePromo(p.id, target);
    }
    report.promotions.changed++;
    report.promotions.rows.push({
      id: p.id,
      title: p.title,
      status: "updated",
      from_image_url: p.image_url ?? null,
      to_image_path: target,
    });

    if (!NO_MOVES && isLocalPublicPath(p.image_url ?? null)) {
      const fromFs = toFsPathFromDbOrUrl(p.image_url!.trim());
      const toFs = toFsPathFromDbOrUrl("/" + target);
      if (fromFs && toFs) {
        report.moves.push({
          from: fromFs,
          to: toFs,
          why: `Promo ${p.title ?? p.id} (P-${code3})`,
        });
      }
    }
  }

  // ===== ESCRIBIR REPORTE =====
  const reportPath = path.join(process.cwd(), "scripts", "_media_migration_report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Reporte: ${reportPath}`);

  // ===== GENERAR SCRIPT DE MOVES =====
  if (!NO_MOVES) {
    const movesPath = path.join(process.cwd(), "scripts", "_media_moves.sh");
    const lines: string[] = [];
    lines.push("#!/usr/bin/env bash");
    lines.push("set -euo pipefail");
    lines.push("");
    lines.push('echo "Moviendo archivos a convención media/... (si existen)..."');
    lines.push("");

    // dedupe
    const seen = new Set<string>();
    for (const m of report.moves as MoveOp[]) {
      const key = `${m.from}=>${m.to}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const toDir = path.dirname(m.to);
      lines.push(`# ${m.why}`);
      lines.push(`mkdir -p "${toDir}"`);
      lines.push(`if [ -f "${m.from}" ]; then`);
      lines.push(`  mv "${m.from}" "${m.to}"`);
      lines.push('  echo "OK: moved"');
      lines.push("else");
      lines.push(`  echo "SKIP: no existe ${m.from}"`);
      lines.push("fi");
      lines.push("");
    }

    fs.writeFileSync(movesPath, lines.join("\n"), "utf-8");
    try {
      fs.chmodSync(movesPath, 0o755);
    } catch {}
    console.log(`Moves script: ${movesPath}`);
    console.log(`(TERMINAL) Para ejecutarlo: bash scripts/_media_moves.sh`);
  }

  console.log("DONE ✅");
  console.log(
    `cafes: ${report.cafes.changed}/${report.cafes.total} updated | promos: ${report.promotions.changed}/${report.promotions.total} updated`
  );
})().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});
