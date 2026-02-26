import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { professorName, email } = body;

  if (!professorName || !email) {
    return NextResponse.json({ error: "Campos obrigatórios." }, { status: 400 });
  }

  const emailLower = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(emailLower)) {
    return NextResponse.json(
      { error: "Formato de email inválido." },
      { status: 400 },
    );
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  const { data: prof, error: profError } = await supabase
    .from("professors")
    .select("id")
    .eq("name", professorName)
    .single();

  if (profError || !prof) {
    return NextResponse.json(
      { error: "Professor não encontrado." },
      { status: 404 },
    );
  }

  const { error: insertError } = await supabase
    .from("email_submissions")
    .upsert(
      {
        professor_id: prof.id,
        email_submitted: emailLower,
        ip,
      },
      { onConflict: "professor_id,ip" },
    );

  if (insertError) {
    console.error("Email submission error:", insertError);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
