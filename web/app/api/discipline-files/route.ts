import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5 MB
const RATE_LIMIT = 5;
const VALID_TYPES = ["prova", "lista", "resumo", "apostila", "vs"];
const PROVA_LABEL_RE = /^P\d+\s*-\s*.+$/;

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  // Rate limit: 5 uploads/24h per IP
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("discipline_files")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: "Limite de uploads atingido. Tente novamente em 24h." },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const disciplinaCodigo = formData.get("disciplina_codigo") as string | null;
  const fileType = formData.get("file_type") as string | null;
  const label = formData.get("label") as string | null;
  const fileHash = formData.get("file_hash") as string | null;
  const periodo = (formData.get("periodo") as string | null)?.trim() || null;
  const professorNome = (formData.get("professor_nome") as string | null)?.trim() || null;

  if (!file || !disciplinaCodigo || !fileType || !label || !fileHash) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  if (!VALID_TYPES.includes(fileType)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  if (label.length > 100) {
    return NextResponse.json(
      { error: "Label muito longo (máx 100 caracteres)." },
      { status: 400 }
    );
  }

  // Validate prova label format: "2026.1 - P1 - Nome da Disciplina"
  if (fileType === "prova" && !PROVA_LABEL_RE.test(label.trim())) {
    return NextResponse.json(
      {
        error: 'Para provas, use o formato "P1 - Nome da Disciplina".',
      },
      { status: 400 }
    );
  }

  // Validate periodo format if provided
  if (periodo && !/^\d{4}\.\d$/.test(periodo)) {
    return NextResponse.json(
      { error: 'Período inválido. Use o formato "2026.1".' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máx 4.5 MB)." },
      { status: 400 }
    );
  }

  // Validate MIME: check magic bytes for %PDF
  const buffer = Buffer.from(await file.arrayBuffer());
  const header = buffer.subarray(0, 5).toString("ascii");
  if (!header.startsWith("%PDF")) {
    return NextResponse.json(
      { error: "Apenas arquivos PDF são aceitos." },
      { status: 400 }
    );
  }

  // Check duplicate
  const { data: existing } = await supabase
    .from("discipline_files")
    .select("id")
    .eq("disciplina_codigo", disciplinaCodigo)
    .eq("file_hash", fileHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Este arquivo já foi enviado para esta disciplina." },
      { status: 409 }
    );
  }

  // Upload to storage
  const filePath = `${disciplinaCodigo}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("discipline-files")
    .upload(filePath, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: "Erro ao salvar arquivo." }, { status: 500 });
  }

  // Insert metadata
  const { data: inserted, error: insertError } = await supabase
    .from("discipline_files")
    .insert({
      disciplina_codigo: disciplinaCodigo,
      file_type: fileType,
      label: label.trim(),
      file_path: filePath,
      file_size: file.size,
      file_hash: fileHash,
      periodo,
      professor_nome: professorNome,
      ip,
    })
    .select(
      "id, disciplina_codigo, file_type, label, file_size, downloads_count, periodo, professor_nome, created_at"
    )
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    // Clean up uploaded file
    await supabase.storage.from("discipline-files").remove([filePath]);
    return NextResponse.json({ error: "Erro ao registrar arquivo." }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}
