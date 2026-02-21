import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grade Horária UFF",
  description: "Monte sua grade de horários da UFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
