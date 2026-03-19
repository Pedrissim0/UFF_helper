import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { professorName, disciplinaCodigo, rating } = body;

  if (!professorName || !disciplinaCodigo || rating === undefined || rating === null) {
    return NextResponse.json({ error: "Campos obrigatórios." }, { status: 400 });
  }

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5) {
    return NextResponse.json(
      { error: "Rating deve ser inteiro entre 0 e 5." },
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
    .from("difficulty_ratings")
    .upsert(
      {
        professor_id: prof.id,
        disciplina_codigo: disciplinaCodigo,
        rating: ratingNum,
        ip,
      },
      { onConflict: "professor_id,disciplina_codigo,ip" },
    );

  if (insertError) {
    console.error("Difficulty rating error:", insertError);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
