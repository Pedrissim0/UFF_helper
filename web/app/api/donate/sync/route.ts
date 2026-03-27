import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface AbacateBilling {
  id: string;
  status: string;
}

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

  // Busca doações pendentes no Supabase
  const { data: pending, error: fetchError } = await supabase
    .from("donations")
    .select("billing_id")
    .eq("status", "PENDING");

  if (fetchError || !pending || pending.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Busca todos os billings na AbacatePay (único endpoint disponível)
  let billings: AbacateBilling[] = [];
  try {
    const res = await fetch("https://api.abacatepay.com/v1/billing/list", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "AbacatePay API error", status: res.status },
        { status: 502 }
      );
    }

    const body = await res.json();
    billings = body?.data ?? [];
  } catch {
    return NextResponse.json({ error: "Failed to reach AbacatePay" }, { status: 502 });
  }

  // Mapeia billing_id → status para busca rápida
  const statusMap = new Map<string, string>();
  for (const b of billings) {
    statusMap.set(b.id, b.status);
  }

  // Atualiza doações pendentes cujo billing já foi pago
  let updated = 0;
  for (const donation of pending) {
    const status = statusMap.get(donation.billing_id);

    if (status === "PAID") {
      const { error: updateError } = await supabase
        .from("donations")
        .update({ status: "PAID", paid_at: new Date().toISOString() })
        .eq("billing_id", donation.billing_id);

      if (!updateError) updated++;
    }
  }

  return NextResponse.json({ updated, checked: pending.length });
}
