import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 300; // 5 min

export async function GET() {
  const { data, error } = await supabase
    .from("donations")
    .select("amount")
    .eq("status", "PAID");

  if (error) {
    console.error("Donate total error:", error);
    return NextResponse.json({ totalCents: 0 }, { status: 200 });
  }

  const totalCents = (data ?? []).reduce(
    (sum: number, row: { amount: number }) => sum + row.amount,
    0
  );

  return NextResponse.json(
    { totalCents },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    }
  );
}
