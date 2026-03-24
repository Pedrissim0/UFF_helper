import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const { data: file, error } = await supabase
    .from("discipline_files")
    .select("id, file_path, downloads_count, flagged")
    .eq("id", id)
    .maybeSingle();

  if (error || !file || file.flagged) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  // Increment downloads_count
  await supabase
    .from("discipline_files")
    .update({ downloads_count: (file.downloads_count ?? 0) + 1 })
    .eq("id", id);

  // Generate signed URL (60 seconds)
  const { data: signedUrl, error: signError } = await supabase.storage
    .from("discipline-files")
    .createSignedUrl(file.file_path, 60);

  if (signError || !signedUrl?.signedUrl) {
    console.error("Signed URL error:", signError);
    return NextResponse.json({ error: "Erro ao gerar link." }, { status: 500 });
  }

  return NextResponse.redirect(signedUrl.signedUrl);
}
