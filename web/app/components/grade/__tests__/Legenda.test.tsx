import React from "react";
import { render, screen } from "@testing-library/react";
import Legenda from "../Legenda";
import type { Materia } from "../../../grade/page";

const materia: Materia = {
  codigo: "ECO001",
  nome: "Micro I",
  turma: "A1",
  nome_exibicao: "PROF SILVA",
  ch: 60,
  link: "",
  horarios: { seg: "14:00-16:00", ter: "", qua: "", qui: "", sex: "", sab: "" },
  periodo: 1,
  tipo: "obrigatoria",
  prerequisitos: [],
  corequisitos: [],
};

describe("Legenda", () => {
  it("não renderiza quando sem selecionadas", () => {
    const { container } = render(<Legenda selecionadas={[]} colorMap={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza nome e professor para cada selecionada", () => {
    render(<Legenda selecionadas={[materia]} colorMap={{ "ECO001-A1": "#6366f1" }} />);
    expect(screen.getByText("Micro I")).toBeInTheDocument();
    expect(screen.getByText("PROF SILVA")).toBeInTheDocument();
  });

  it("renderiza múltiplas disciplinas", () => {
    const materia2: Materia = {
      ...materia,
      codigo: "ECO002",
      nome: "Macro I",
      turma: "B1",
      nome_exibicao: "PROF SOUZA",
    };
    render(
      <Legenda
        selecionadas={[materia, materia2]}
        colorMap={{ "ECO001-A1": "#6366f1", "ECO002-B1": "#f59e0b" }}
      />
    );
    expect(screen.getByText("Micro I")).toBeInTheDocument();
    expect(screen.getByText("Macro I")).toBeInTheDocument();
  });
});
