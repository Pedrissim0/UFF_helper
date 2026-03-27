import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/donate/sync
 *
 * Verifica billings PENDING no Supabase e consulta a AbacatePay
 * para atualizar os que já foram pagos. Funciona como fallback
 * quando o webhook não chega (ex: sandbox, rede instável).
 */
export async function GET() {
  const apiKey = process.env.ABACATEPAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }

  // Busca doações pendentes
  const { data: pending, error: fetchError } = await supabase
    .from("donations")
    .select("billing_id, amount")
    .eq("status", "PENDING");

  if (fetchError || !pending || pending.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  let updated = 0;

  for (const donation of pending) {
    try {
      // Consulta status do billing na AbacatePay
      const res = await fetch(
        `https://api.abacatepay.com/v1/billing/show/${donation.billing_id}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      if (!res.ok) continue;

      const body = await res.json();
      const status = body?.data?.status;

      if (status === "PAID" || status === "COMPLETED") {
        const { error: updateError } = await supabase
          .from("donations")
          .update({ status: "PAID", paid_at: new Date().toISOString() })
          .eq("billing_id", donation.billing_id);

        if (!updateError) updated++;
      }
    } catch {
      // Continua com o próximo billing
    }
  }

  return NextResponse.json({ updated });
}
