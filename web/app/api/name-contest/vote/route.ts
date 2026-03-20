import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { suggestionId } = body;

  if (!suggestionId || typeof suggestionId !== "string") {
    return NextResponse.json({ error: "suggestionId é obrigatório." }, { status: 400 });
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  const { error: voteError } = await supabase
    .from("name_votes")
    .upsert({ suggestion_id: suggestionId, ip }, { onConflict: "suggestion_id,ip" });

  if (voteError) {
    console.error("Name vote error:", voteError);
    return NextResponse.json({ error: "Erro ao registrar voto." }, { status: 500 });
  }

  // Atualiza votes_count com COUNT atômico
  const { count } = await supabase
    .from("name_votes")
    .select("*", { count: "exact", head: true })
    .eq("suggestion_id", suggestionId);

  const { error: updateError } = await supabase
    .from("name_suggestions")
    .update({ votes_count: count })
    .eq("id", suggestionId);

  if (updateError) {
    console.error("Vote count update error:", updateError);
  }

  return NextResponse.json({ ok: true });
}
