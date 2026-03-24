import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;

  // Upsert report (one per IP per file)
  const { error: reportError } = await supabase
    .from("discipline_file_reports")
    .upsert({ file_id: id, ip, reason }, { onConflict: "file_id,ip" });

  if (reportError) {
    console.error("Report error:", reportError);
    return NextResponse.json({ error: "Erro ao registrar denúncia." }, { status: 500 });
  }

  // Count reports — auto-flag at 3
  const { count } = await supabase
    .from("discipline_file_reports")
    .select("id", { count: "exact", head: true })
    .eq("file_id", id);

  if ((count ?? 0) >= 3) {
    await supabase.from("discipline_files").update({ flagged: true }).eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
