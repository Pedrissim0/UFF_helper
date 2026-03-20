import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "./components/Footer";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
