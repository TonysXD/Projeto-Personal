import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

type StudentRow = {
  name: string;
  whatsapp: string | null;
  plan_name: string | null;
};

type EvolutionRow = {
  created_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat: number | null;
  notes: string | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return supabase;
}

function todayBR(): string {
  const br = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return `${br.getFullYear()}-${String(br.getMonth() + 1).padStart(2, "0")}-${String(br.getDate()).padStart(2, "0")}`;
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// ============================================================
// GERAÇÃO DO PDF
// (ajuste os nomes dos campos de evolution ao seu banco)
// ============================================================
async function buildReportPdf(
  student: StudentRow,
  records: EvolutionRow[],
  photoUrls: string[]
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();
  let y = 800;

  // Cabeçalho
  page.drawText("Relatório de Evolução", {
    x: 50, y, size: 22, font: bold, color: rgb(0.8, 0.1, 0.1),
  });
  y -= 28;
  page.drawText(`Aluno: ${student.name}`, { x: 50, y, size: 14, font: bold });
  y -= 18;
  page.drawText(
    `WhatsApp: ${student.whatsapp ?? "—"}    Plano: ${student.plan_name ?? "—"}`,
    { x: 50, y, size: 10, font }
  );
  y -= 14;
  page.drawText(`Gerado em ${formatDateBR(todayBR())}`, { x: 50, y, size: 10, font });
  y -= 30;

  // Cards de resumo (primeiro e último registro)
  if (records.length > 0) {
    const first = records[records.length - 1];
    const last = records[0];
    const cardW = (width - 140) / 2;
    const cards: Array<[string, string]> = [
      ["Primeiro registro", `${first.weight_kg != null ? first.weight_kg + " kg" : "—"}`],
      ["Último registro", `${last.weight_kg != null ? last.weight_kg + " kg" : "—"}`],
    ];
    cards.forEach(([label, value], i) => {
      const x = 50 + i * (cardW + 40);
      page.drawRectangle({
        x, y: y - 55, width: cardW, height: 55,
        borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 1,
      });
      page.drawText(label, { x: x + 10, y: y - 20, size: 10, font });
      page.drawText(value, { x: x + 10, y: y - 40, size: 16, font: bold });
    });
    y -= 80;
  }

  // Tabela de histórico
  page.drawText("Histórico de evolução", { x: 50, y, size: 14, font: bold });
  y -= 22;
  const colX = [50, 150, 250, 350, 450];
  const headers = ["Data", "Peso (kg)", "Altura (cm)", "Gordura (%)", "Observações"];
  headers.forEach((h, i) =>
    page.drawText(h, { x: colX[i], y, size: 9, font: bold, color: rgb(0.4, 0.4, 0.4) })
  );
  y -= 14;
  page.drawLine({
    start: { x: 50, y }, end: { x: width - 50, y },
    thickness: 0.5, color: rgb(0.85, 0.85, 0.85),
  });
  y -= 16;

  for (const r of records) {
    if (y < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
      headers.forEach((h, i) =>
        page.drawText(h, { x: colX[i], y, size: 9, font: bold, color: rgb(0.4, 0.4, 0.4) })
      );
      y -= 14;
      page.drawLine({
        start: { x: 50, y }, end: { x: width - 50, y },
        thickness: 0.5, color: rgb(0.85, 0.85, 0.85),
      });
      y -= 16;
    }
    page.drawText(formatDateBR(r.created_at), { x: colX[0], y, size: 9, font });
    page.drawText(r.weight_kg != null ? String(r.weight_kg) : "—", { x: colX[1], y, size: 9, font });
    page.drawText(r.height_cm != null ? String(r.height_cm) : "—", { x: colX[2], y, size: 9, font });
    page.drawText(r.body_fat != null ? String(r.body_fat) : "—", { x: colX[3], y, size: 9, font });
    page.drawText((r.notes ?? "").slice(0, 40), { x: colX[4], y, size: 9, font });
    y -= 16;
  }

  // Fotos (uma por página, quando necessário)
  for (const url of photoUrls) {
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const img = await pdfDoc.embedJpg(buf).catch(() => pdfDoc.embedPng(buf));
      const pw = 250;
      const ph = (img.height / img.width) * pw;
      if (y - ph < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }
      page.drawImage(img, { x: 50, y: y - ph, width: pw, height: ph });
      y -= ph + 20;
    } catch {
      // foto não carregou — ignora e segue
    }
  }

  return Buffer.from(await pdfDoc.save());
}

// ============================================================
// GET — baixar o PDF
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await requireUser();
  if (!supabase) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;

  const { data: student } = await supabase
    .from("students")
    .select("name, whatsapp, plan_name")
    .eq("id", id)
    .single();

  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const { data: records } = await supabase
    .from("evolution")
    .select("created_at, weight_kg, height_cm, body_fat, notes")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const { data: photos } = await supabase
    .from("evolution_photos")
    .select("url")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const pdf = await buildReportPdf(
    student as StudentRow,
    (records ?? []) as EvolutionRow[],
    (photos ?? []).map((p) => (p as { url: string }).url).filter(Boolean)
  );

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${id}.pdf"`,
    },
  });
}

// ============================================================
// POST — enviar por e-mail (com RATE LIMIT)
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await requireUser();
  if (!supabase) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  // ========== RATE LIMIT — É AQUI QUE ENTRA ==========
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown")
    .split(",")[0]
    .trim();
  const check = rateLimit(`report-email:${ip}`, 5, 60_000);
  if (!check.ok) {
    return Response.json(
      { error: `Muitas tentativas. Aguarde ${check.retryAfter}s.` },
      { status: 429 }
    );
  }
  // ===================================================

  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  if (!email) {
    return Response.json({ error: "E-mail obrigatório." }, { status: 400 });
  }

  const { data: student } = await supabase
    .from("students")
    .select("name, whatsapp, plan_name")
    .eq("id", id)
    .single();

  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const { data: records } = await supabase
    .from("evolution")
    .select("created_at, weight_kg, height_cm, body_fat, notes")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const { data: photos } = await supabase
    .from("evolution_photos")
    .select("url")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const pdf = await buildReportPdf(
    student as StudentRow,
    (records ?? []) as EvolutionRow[],
    (photos ?? []).map((p) => (p as { url: string }).url).filter(Boolean)
  );

  const { error: sendError } = await resend.emails.send({
    from: "Relatório <onboarding@resend.dev>", // troque pelo seu domínio verificado no Resend
    to: [email],
    subject: `Relatório de evolução — ${student.name}`,
    text: `Segue em anexo o relatório de evolução de ${student.name}.`,
    attachments: [
      {
        filename: `relatorio-${student.name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
        content: pdf,
      },
    ],
  });

  if (sendError) {
    return Response.json({ error: "Não foi possível enviar o e-mail." }, { status: 500 });
  }

  return Response.json({ ok: true });
}