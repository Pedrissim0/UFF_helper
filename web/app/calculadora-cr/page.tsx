import CalculadoraCR from "./CalculadoraCR";

export const metadata = {
  title: "Calculadora de CR",
  description:
    "Calcule seu Coeficiente de Rendimento acumulado por semestre com projeções.",
};

export default function CalculadoraCRPage() {
  return <CalculadoraCR />;
}
