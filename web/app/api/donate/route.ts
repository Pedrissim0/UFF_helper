import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ABACATEPAY_API_URL = "https://api.abacatepay.com/v1/billing/create";
const MIN_AMOUNT = 100; // R$1 em centavos

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amount, donorName } = body;

  if (!amount || typeof amount !== "number" || amount < MIN_AMOUNT) {
    return NextResponse.json({ error: "Valor mínimo: R$1,00." }, { status: 400 });
  }

  const apiKey = process.env.ABACATEPAY_API_KEY;
  if (!apiKey) {
    console.error("ABACATEPAY_API_KEY not configured");
    return NextResponse.json(
      { error: "Serviço de pagamento indisponível." },
      { status: 503 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    // Create billing on AbacatePay
    const abacateRes = await fetch(ABACATEPAY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        frequency: "ONE_TIME",
        methods: ["PIX"],
        products: [
          {
            externalId: "donate",
            name: "Doação ao Projeto",
            quantity: 1,
            price: amount,
          },
        ],
        customer: {
          name: donorName?.trim() || "Doador Anônimo",
          email: "doacao@uffhelper.com",
          cellphone: "5521000000000",
          taxId: "529.982.247-25",
        },
        returnUrl: `${siteUrl}`,
        completionUrl: `${siteUrl}`,
      }),
    });

    const abacateData = await abacateRes.json();

    if (!abacateData.success || !abacateData.data) {
      console.error("AbacatePay error:", abacateData);
      return NextResponse.json({ error: "Erro ao criar cobrança." }, { status: 502 });
    }

    const billing = abacateData.data;

    // Save to Supabase
    await supabase.from("donations").insert({
      billing_id: billing.id,
      amount,
      donor_name: donorName?.trim() || null,
      status: "PENDING",
    });

    return NextResponse.json({ url: billing.url }, { status: 201 });
  } catch (err) {
    console.error("Donate error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
