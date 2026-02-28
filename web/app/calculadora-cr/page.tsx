import CalculadoraCR from "./CalculadoraCR";

export const metadata = {
  title: "Calculadora de CR · UFF",
  description: "Calcule seu Coeficiente de Rendimento acumulado por semestre",
};

export default function CalculadoraCRPage() {
  return <CalculadoraCR />;
}
