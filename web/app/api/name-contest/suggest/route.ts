import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { suggestedName, studentName, whatsapp, pixKey } = body;

  if (!suggestedName || !studentName || !whatsapp || !pixKey) {
    return NextResponse.json(
      { error: "Todos os campos são obrigatórios." },
      { status: 400 }
    );
  }

  if (typeof suggestedName !== "string" || suggestedName.trim().length === 0) {
    return NextResponse.json(
      { error: "Nome sugerido não pode ser vazio." },
      { status: 400 }
    );
  }

  if (suggestedName.trim().length > 60) {
    return NextResponse.json(
      { error: "Nome sugerido deve ter no máximo 60 caracteres." },
      { status: 400 }
    );
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  const { error: insertError } = await supabase.from("name_suggestions").insert({
    suggested_name: suggestedName.trim(),
    student_name: studentName.trim(),
    whatsapp: whatsapp.trim(),
    pix_key: pixKey.trim(),
    ip,
  });

  if (insertError) {
    console.error("Name suggestion error:", insertError);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
