import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Validate webhook secret via query param
  const secret = req.nextUrl.searchParams.get("webhookSecret");
  const expectedSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { event, data } = body;

  if (event === "billing.paid" && data?.id) {
    const { error } = await supabase
      .from("donations")
      .update({ status: "PAID", paid_at: new Date().toISOString() })
      .eq("billing_id", data.id);

    if (error) {
      console.error("Webhook update error:", error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
