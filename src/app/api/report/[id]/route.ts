import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { capitalizeName, formatDateBR } from "@/lib/format";

const resend = new Resend(process.env.RESEND_API_KEY);

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

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Peso normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidade";
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

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ============================================================
// Geração do PDF (compartilhada entre GET e POST)
// ============================================================
async function buildReportPdf(student: any, rows: RawRecord[], photosByRecord: Map<string, Photo[]>) {
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
      const test = current ? `${current} ${word}` : word;
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
  const title = "RELATÓRIO DE EVOLUÇÃO";
  page.drawText(title, { x: MARGIN, y: y - 20, size: 20, font: fontBold, color: RED });
  const dateStr = `Gerado em ${todayStr()}`;
  const dateW = font.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, {
    x: PAGE_W - MARGIN - dateW,
    y: y - 16,
    size: 9,
    font,
    color: GRAY,
  });
  y -= 42;

  const nameStr = sanitize(capitalizeName(student.name));
  line(nameStr, MARGIN, 16, fontBold, DARK, 22);

  const meta: string[] = [];
  if (student.whatsapp) meta.push(`WhatsApp: ${student.whatsapp}`);
  if (student.birth_date) meta.push(`Nascimento: ${formatDateBR(student.birth_date)} (${calcAge(student.birth_date)} anos)`);
  if (student.plan_name) meta.push(`Plano: ${student.plan_name}`);
  const metaStr = sanitize(meta.join("  |  "));
  if (metaStr) {
    const nameMaxW = PAGE_W - MARGIN * 2 - 20;
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
    {
      label: "Peso atual",
      value: last?.weight != null ? `${last.weight} kg` : "—",
      sub: currBmi != null ? `IMC ${currBmi.toFixed(1)}` : "",
    },
    {
      label: "IMC",
      value: currBmi != null ? currBmi.toFixed(1) : "—",
      sub: currBmi != null ? bmiLabel(currBmi) : "",
    },
    { label: "Registros", value: String(rows.length), sub: "" },
    {
      label: "Variação desde o 1º",
      value: delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg` : "—",
      sub: "",
    },
  ];

  ensureSpace(56);
  const boxGap = 12;
  const boxW = (CONTENT_W - boxGap * 3) / 4;
  const boxH = 54;
  for (let i = 0; i < boxes.length; i++) {
    const bx = MARGIN + i * (boxW + boxGap);
    page.drawRectangle({
      x: bx,
      y: y - boxH,
      width: boxW,
      height: boxH,
      color: LIGHT,
    });
    page.drawText(boxes[i].label, { x: bx + 10, y: y - 18, size: 8, font: fontBold, color: GRAY });
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
    { label: "Medidas (cm)", x: MARGIN + 284, w: CONTENT_W - 284 },
  ];

  const headerH = 22;
  page.drawRectangle({
    x: MARGIN,
    y: y - headerH,
    width: CONTENT_W,
    height: headerH,
    color: DARK,
  });
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

    const measureParts: string[] = [];
    if (r.measurements) {
      for (const [key, val] of Object.entries(r.measurements)) {
        const label = MEASURE_LABELS[key] ?? key;
        measureParts.push(`${label}: ${val}`);
      }
    }
    const measureStr = measureParts.length ? measureParts.join("  |  ") : "—";

    const cells: string[] = [
      formatDateBR(r.record_date),
      r.weight != null ? `${r.weight} kg` : "—",
      r.height != null ? `${r.height} cm` : "—",
      r.body_fat != null ? `${r.body_fat}%` : "—",
      rBmi ? rBmi.toFixed(1) : "—",
      measureStr,
    ];

    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      const textValue = sanitize(cells[c]);
      const maxW = col.w - 12;
      const size = 8.5;
      if (col === cols[cols.length - 1] && textValue.length > 0) {
        const wrapped = wrapLines(textValue, maxW, size, font);
        wrapped.slice(0, 2).forEach((wl, wi) => {
          page.drawText(wl, { x: col.x + 6, y: y - 14 - wi * 10, size, font, color: DARK });
        });
      } else {
        page.drawText(textValue, { x: col.x + 6, y: y - 14, size, font, color: DARK });
      }
    }

    if (hasNotes) {
      const noteText = sanitize(r.notes);
      const wrapped = wrapLines(noteText, CONTENT_W - 12, 7.5, fontOblique);
      wrapped.slice(0, 2).forEach((wl, wi) => {
        page.drawText(wl, { x: MARGIN + 6, y: y - 24 - wi * 9, size: 7.5, font: fontOblique, color: GRAY });
      });
    }

    y -= rowH + 4;
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

      let img: PDFImage;
      try {
        const res = await fetch(ph.url);
        const buf = Buffer.from(await res.arrayBuffer());
        img = await pdfDoc.embedJpg(buf);
      } catch {
        continue;
      }

      const ratio = img.width / img.height;
      let w = thumb;
      let h = thumb;
      if (ratio > 1) {
        h = thumb / ratio;
      } else {
        w = thumb * ratio;
      }

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

    y -= thumb + thumbGap;
  }

  return await pdfDoc.save();
}

// ============================================================
// GET — baixa o PDF
// ============================================================
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    const { data: records, error: recordsError } = await supabase
      .from("evolution")
      .select("id, record_date, weight, height, body_fat, measurements, notes")
      .eq("student_id", id)
      .order("record_date", { ascending: true });

    if (recordsError) {
      console.error("Report: evolution query error", recordsError.message);
    }

    const rows: RawRecord[] = (records ?? []) as RawRecord[];

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
        list.push({ id: ph.id, url: ph.url });
        photosByRecord.set(evId, list);
      }
    }

    const bytes = await buildReportPdf(student, rows, photosByRecord);

    const safeName = sanitize(student.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const pdfBuffer = Buffer.from(bytes);
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

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
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return new NextResponse("Erro ao gerar o relatório", { status: 500 });
  }
}

// ============================================================
// POST — envia o PDF por e-mail (Resend)
// ============================================================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const emailTo = (body.email ?? "").trim() as string;

    if (!emailTo) {
      return NextResponse.json({ error: "E-mail do destinatário é obrigatório." }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    }

    const { data: records } = await supabase
      .from("evolution")
      .select("id, record_date, weight, height, body_fat, measurements, notes")
      .eq("student_id", id)
      .order("record_date", { ascending: true });

    const rows: RawRecord[] = (records ?? []) as RawRecord[];

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
        list.push({ id: ph.id, url: ph.url });
        photosByRecord.set(evId, list);
      }
    }

    const bytes = await buildReportPdf(student, rows, photosByRecord);
    const pdfBuffer = Buffer.from(bytes);

    const safeName = sanitize(student.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Sistema Personal <onboarding@resend.dev>",
      to: [emailTo],
      subject: `Relatório de evolução — ${capitalizeName(student.name)}`,
      text: `Olá! Segue em anexo o relatório de evolução de ${capitalizeName(student.name)}, gerado em ${todayStr()}.`,
      attachments: [
        {
          filename: `relatorio-${safeName || "aluno"}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: "Falha ao enviar o e-mail." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: emailData?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Report email error:", err);
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: "Erro ao enviar o relatório" }, { status: 500 });
  }
}