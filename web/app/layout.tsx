import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "./components/Footer";
import DonateBar from "./components/DonateBar";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  metadataBase: new URL("https://uff-helper.vercel.app"),
  title: {
    default: "UFF Helper",
    template: "%s | UFF Helper",
  },
  description:
    "Grade horária, calculadora de CR, controlador de faltas e roadmap curricular para alunos de Economia da UFF.",
  openGraph: {
    title: "UFF Helper",
    description:
      "Grade horária, calculadora de CR, controlador de faltas e roadmap curricular para alunos de Economia da UFF.",
    url: "https://uff-helper.vercel.app",
    siteName: "UFF Helper",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const MONTHLY_COST_CENTS = Number(process.env.NEXT_PUBLIC_MONTHLY_COST_CENTS || "5000");

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data } = await supabase.from("donations").select("amount").eq("status", "PAID");

  const totalCents = (data ?? []).reduce(
    (sum: number, row: { amount: number }) => sum + row.amount,
    0
  );

  return (
    <html lang="pt-BR">
      <body>
        <DonateBar totalCents={totalCents} monthlyCostCents={MONTHLY_COST_CENTS} />
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
