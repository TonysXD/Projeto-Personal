import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { capitalizeName, formatDateBR } from "@/lib/format";

type Photo = { id: string; url: string };

type RawRecord = {
  id: string;
  record_date: string;
  weight: number | null;
  height: number | null;
  body_fat: number | null;
  measurements: Record<string, number> | null;
  notes: string | null;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

const DARK = rgb(0.15, 0.15, 0.18);
const GRAY = rgb(0.45, 0.45, 0.5);
const LIGHT = rgb(0.96, 0.96, 0.97);
const LIGHT_LINE = rgb(0.85, 0.85, 0.88);
const RED = rgb(0.82, 0.16, 0.16);
const WHITE = rgb(1, 1, 1);

function sanitize(text: string | null | undefined): string {
  if (!text) return "";
  const mapped = text
    .replace(/[–—]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(mapped)
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      // ASCII + Latin-1 (letras acentuadas: ç, ã, é...) + pontuações do WinAnsi
      if (code <= 0x7f || (code >= 0xa0 && code <= 0xff)) return ch;
      if (
        code === 0x20ac || // €
        (code >= 0x2018 && code <= 0x201d) || // ' ' " "
        code === 0x2013 || code === 0x2014 || // – —
        code === 0x2022 || code === 0x2026 // • …
      ) {
        return ch;
      }
      return "?";
    })
    .join("");
}

function calcBMI(weight: number, heightCm: number) {
  if (!weight || !heightCm || heightCm <= 0) return null;
  const h = heightCm / 100;
  return weight / (h * h);
}

function calcAge(birth: string) {
  const b = new Date(birth + "T12:00:00");
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const MEASURE_LABELS: Record<string, string> = {
  cintura: "Cintura",
  braco: "Braço",
  quadril: "Quadril",
  coxa: "Coxa",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      console.error("Report: auth error", authError.message);
      return new NextResponse("Não autorizado", { status: 401 });
    }
    if (!user) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

    if (studentError || !student) {
      return new NextResponse("Aluno não encontrado", { status: 404 });
    }

    // Busca os registros SEM consulta aninhada (mais robusto)
    const { data: records, error: recordsError } = await supabase
      .from("evolution")
      .select("id, record_date, weight, height, body_fat, measurements, notes")
      .eq("student_id", id)
      .order("record_date", { ascending: true });

    if (recordsError) {
      console.error("Report: evolution query error", recordsError.message);
    }

    const rows: RawRecord[] = (records ?? []) as RawRecord[];

    // Busca as fotos em uma consulta separada e agrupa por evolution_id
    const photosByRecord = new Map<string, Photo[]>();
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const { data: photos } = await supabase
        .from("evolution_photos")
        .select("id, url, evolution_id")
        .in("evolution_id", ids);

      for (const ph of photos ?? []) {
        const evId = (ph as unknown as { evolution_id: string }).evolution_id;
        const list = photosByRecord.get(evId) ?? [];
        list.push({ id: (ph as unknown as { id: string }).id, url: ph.url });
        photosByRecord.set(evId, list);
      }
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function ensureSpace(space: number, min = MARGIN) {
      if (y - space < min) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
    }

    function line(
      textValue: string,
      x: number,
      size: number,
      f: PDFFont = font,
      color = DARK,
      lh?: number
    ) {
      const h = lh ?? size * 1.35;
      page.drawText(textValue, {
        x,
        y: y - size,
        size,
        font: f,
        color,
      });
      y -= h;
    }

    function wrapLines(
      textValue: string,
      maxWidth: number,
      size: number,
      f: PDFFont
    ): string[] {
      const words = textValue.split(" ");
      const result: string[] = [];
      let current = "";
      for (const word of words) {
        const test = current ? current + " " + word : word;
        if (f.widthOfTextAtSize(test, size) > maxWidth && current) {
          result.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) result.push(current);
      return result;
    }

    // ===== 1. Cabeçalho =====
    const name = sanitize(capitalizeName(student.name));
    const todayStr = new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    const title = "RELATÓRIO DE EVOLUÇÃO";
    page.drawText(title, { x: MARGIN, y: y - 20, size: 20, font: fontBold, color: RED });
    const dateStr = `Gerado em ${todayStr}`;
    const dateW = font.widthOfTextAtSize(dateStr, 9);
    page.drawText(dateStr, {
      x: PAGE_W - MARGIN - dateW,
      y: y - 14,
      size: 9,
      font,
      color: GRAY,
    });
    y -= 30;

    const nameMaxW = CONTENT_W - 76;
    const nameLines = wrapLines(name, nameMaxW, 16, fontBold);
    for (const nl of nameLines.slice(0, 2)) {
      line(nl, MARGIN, 16, fontBold, DARK, 21);
    }

    let photoEmbedded: PDFImage | null = null;
    if (student.photo_url) {
      try {
        const res = await fetch(student.photo_url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          try {
            photoEmbedded = await pdfDoc.embedPng(buf);
          } catch {
            try {
              photoEmbedded = await pdfDoc.embedJpg(buf);
            } catch {
              photoEmbedded = null;
            }
          }
        }
      } catch {
        photoEmbedded = null;
      }
    }
    if (photoEmbedded) {
      const size = 64;
      const scale = Math.min(size / photoEmbedded.width, size / photoEmbedded.height);
      const w = photoEmbedded.width * scale;
      const h = photoEmbedded.height * scale;
      page.drawImage(photoEmbedded, {
        x: PAGE_W - MARGIN - w,
        y: y + 8 - h,
        width: w,
        height: h,
      });
    }

    y -= 6;

    const meta: string[] = [];
    if (student.whatsapp) meta.push(`WhatsApp: ${student.whatsapp}`);
    if (student.birth_date) meta.push(`Nascimento: ${formatDateBR(student.birth_date)} (${calcAge(student.birth_date)} anos)`);
    if (student.plan_name) meta.push(`Plano: ${student.plan_name}`);
    const metaStr = sanitize(meta.join("  |  "));
    if (metaStr) {
      const metaLines = wrapLines(metaStr, nameMaxW, 9.5, font);
      for (const ml of metaLines.slice(0, 3)) {
        line(ml, MARGIN, 9.5, font, GRAY, 14);
      }
    }

    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: LIGHT_LINE,
    });
    y -= 18;

    // ===== 2. Cards de resumo =====
    const last = rows[rows.length - 1];
    const first = rows[0];
    const currBmi =
      last && last.weight != null && last.height != null
        ? calcBMI(last.weight, last.height)
        : null;
    const delta =
      first && last && first.weight != null && last.weight != null
        ? last.weight - first.weight
        : null;

    const boxes = [
      { label: "Peso atual", value: last?.weight != null ? `${last.weight} kg` : "—", sub: "" },
      { label: "IMC atual", value: currBmi ? `${currBmi.toFixed(1)} kg/m²` : "—", sub: "" },
      { label: "Registros", value: String(rows.length), sub: "" },
      { label: "Variação desde o 1º", value: delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg` : "—", sub: "" },
    ];

    ensureSpace(56);
    const boxGap = 12;
    const boxW = (CONTENT_W - boxGap * 3) / 4;
    const boxH = 54;
    for (let i = 0; i < boxes.length; i++) {
      const bx = MARGIN + i * (boxW + boxGap);
      page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: boxH, color: LIGHT });
      page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: 3, color: RED });
      page.drawText(boxes[i].label, { x: bx + 10, y: y - 20, size: 8, font, color: GRAY });
      page.drawText(boxes[i].value, { x: bx + 10, y: y - 38, size: 13, font: fontBold, color: DARK });
      if (boxes[i].sub) {
        page.drawText(boxes[i].sub, { x: bx + 10, y: y - 48, size: 7, font, color: GRAY });
      }
    }
    y -= boxH + 14;

    // ===== 3. Tabela de histórico =====
    ensureSpace(40);
    line("Histórico de registros", MARGIN, 13, fontBold, DARK, 18);
    y -= 4;

    interface ColDef { label: string; x: number; w: number; }
    const cols: ColDef[] = [
      { label: "Data", x: MARGIN, w: 74 },
      { label: "Peso", x: MARGIN + 74, w: 52 },
      { label: "Altura", x: MARGIN + 126, w: 54 },
      { label: "%Gordura", x: MARGIN + 180, w: 56 },
      { label: "IMC", x: MARGIN + 236, w: 48 },
      { label: "Medidas", x: MARGIN + 284, w: CONTENT_W - 284 },
    ];
    const headerH = 22;
    page.drawRectangle({ x: MARGIN, y: y - headerH, width: CONTENT_W, height: headerH, color: DARK });
    for (const c of cols) {
      page.drawText(c.label, { x: c.x + 6, y: y - 15, size: 9, font: fontBold, color: WHITE });
    }
    y -= headerH + 4;

    if (rows.length === 0) {
      line("Nenhum registro de evolução ainda.", MARGIN + 6, 10, font, GRAY, 16);
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const hasNotes = !!sanitize(r.notes);
      const rowH = hasNotes ? 34 : 24;

      ensureSpace(rowH + 6);
      if (i % 2 === 0) {
        page.drawRectangle({ x: MARGIN, y: y - rowH, width: CONTENT_W, height: rowH, color: LIGHT });
      }

      const rBmi = r.weight != null && r.height != null ? calcBMI(r.weight, r.height) : null;

      const cells: string[] = [
        formatDateBR(r.record_date),
        r.weight != null ? `${r.weight} kg` : "—",
        r.height != null ? `${r.height} cm` : "—",
        r.body_fat != null ? `${r.body_fat}%` : "—",
        rBmi ? rBmi.toFixed(1) : "—",
      ];

      const measurementsStr = r.measurements
        ? Object.entries(r.measurements)
            .map(([k, v]) => `${MEASURE_LABELS[k] ?? k}: ${v}`)
            .join(", ")
        : "";

      for (let cIdx = 0; cIdx < cols.length; cIdx++) {
        const cellText = cIdx < 5 ? cells[cIdx] : measurementsStr;
        let display = sanitize(cellText);
        const maxW = cols[cIdx].w - 12;
        const size = cIdx === 5 ? 7.5 : 8.5;
        if (font.widthOfTextAtSize(display, size) > maxW) {
          while (display.length > 1 && font.widthOfTextAtSize(display + "…", size) > maxW) {
            display = display.slice(0, -1);
          }
          display = display + "…";
        }
        page.drawText(display, {
          x: cols[cIdx].x + 6,
          y: y - (hasNotes ? 16 : 15),
          size,
          font,
          color: DARK,
        });
      }

      if (hasNotes) {
        const noteText = sanitize(r.notes);
        let noteDrawn = noteText;
        const maxW = CONTENT_W - 12;
        const nSize = 7.5;
        if (fontOblique.widthOfTextAtSize(noteDrawn, nSize) > maxW) {
          while (noteDrawn.length > 1 && fontOblique.widthOfTextAtSize(noteDrawn + "…", nSize) > maxW) {
            noteDrawn = noteDrawn.slice(0, -1);
          }
          noteDrawn = noteDrawn + "…";
        }
        page.drawText(`Obs: ${noteDrawn}`, {
          x: MARGIN + 6,
          y: y - 28,
          size: nSize,
          font: fontOblique,
          color: GRAY,
        });
      }

      y -= rowH + 2;
    }

    // ===== 4. Fotos de evolução =====
    let photosDrawn = 0;
    const maxPhotos = 12;

    for (const r of rows) {
      if (photosDrawn >= maxPhotos) break;
      const photos = photosByRecord.get(r.id) ?? [];
      if (!photos.length) continue;

      const photoTitle = `Fotos - ${formatDateBR(r.record_date)}`;
      ensureSpace(18 + 110);
      line(photoTitle, MARGIN, 12, fontBold, DARK, 16);

      let px = MARGIN;
      let py = y;
      const thumb = 110;
      const thumbGap = 12;

      for (const ph of photos) {
        if (photosDrawn >= maxPhotos) break;
        let img: PDFImage | null = null;
        try {
          const res = await fetch(ph.url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            try {
              img = await pdfDoc.embedPng(buf);
            } catch {
              try {
                img = await pdfDoc.embedJpg(buf);
              } catch {
                img = null;
              }
            }
          }
        } catch {
          img = null;
        }
        if (!img) continue;

        const scale = Math.min(thumb / img.width, thumb / img.height);
        const w = img.width * scale;
        const h = img.height * scale;

        if (px + w > PAGE_W - MARGIN) {
          py = py - thumb - thumbGap;
          px = MARGIN;
          ensureSpace(thumb + 14);
        }
        if (py - h < MARGIN) {
          ensureSpace(thumb + 14);
          py = y;
          px = MARGIN;
        }

        page.drawImage(img, { x: px, y: py - h, width: w, height: h });
        px += w + thumbGap;
        photosDrawn++;
      }

      y = Math.min(y, py - thumb - thumbGap);
      y -= 6;
    }

    // ===== Salvar =====
    const bytes = await pdfDoc.save();
    const safeName = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const pdfBlob = new Blob([bytes as unknown as BlobPart], {
      type: "application/pdf",
    });

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-${safeName || "aluno"}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Report PDF error:", err);
    // Em desenvolvimento, expõe o erro real para facilitar o diagnóstico
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return new NextResponse("Erro ao gerar o relatório", { status: 500 });
  }
}