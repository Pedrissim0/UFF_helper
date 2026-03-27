import React from "react";
import { render, screen } from "@testing-library/react";
import GradeSemanal from "../GradeSemanal";
import type { Materia } from "../../../grade/page";

const materia: Materia = {
  codigo: "ECO001",
  nome: "Micro I",
  turma: "A1",
  nome_exibicao: "PROF",
  ch: 60,
  link: "",
  horarios: {
    seg: "14:00-16:00",
    ter: "",
    qua: "14:00-16:00",
    qui: "",
    sex: "",
    sab: "",
  },
  periodo: 1,
  tipo: "obrigatoria",
  prerequisitos: [],
  corequisitos: [],
};

describe("GradeSemanal", () => {
  it("renderiza cabeçalhos dos dias", () => {
    render(
      <GradeSemanal
        selecionadas={[materia]}
        colorMap={{ "ECO001-A1": "#6366f1" }}
        showLegenda={true}
      />
    );
    expect(screen.getByText("SEG")).toBeInTheDocument();
    expect(screen.getByText("TER")).toBeInTheDocument();
    expect(screen.getByText("QUA")).toBeInTheDocument();
    expect(screen.getByText("QUI")).toBeInTheDocument();
    expect(screen.getByText("SEX")).toBeInTheDocument();
    expect(screen.getByText("SÁB")).toBeInTheDocument();
  });

  it("renderiza blocos de horário para disciplina selecionada", () => {
    render(
      <GradeSemanal
        selecionadas={[materia]}
        colorMap={{ "ECO001-A1": "#6366f1" }}
        showLegenda={false}
      />
    );
    // Horários renderizados nos blocos
    const labels = screen.getAllByText("14:00-16:00");
    expect(labels.length).toBe(2); // seg e qua
  });

  it("mostra nome truncado quando showLegenda=true", () => {
    render(
      <GradeSemanal
        selecionadas={[materia]}
        colorMap={{ "ECO001-A1": "#6366f1" }}
        showLegenda={true}
      />
    );
    // "Micro I" -> split -> ["Micro", "I"] -> slice(0,3) -> "Micro I"
    const nomes = screen.getAllByText("Micro I");
    expect(nomes.length).toBeGreaterThanOrEqual(1);
  });

  it("não renderiza blocos quando sem selecionadas", () => {
    const { container } = render(
      <GradeSemanal selecionadas={[]} colorMap={{}} showLegenda={false} />
    );
    // Should still render the grid structure, but no bloco divs
    expect(container.querySelectorAll("[class*='bloco']").length).toBe(0);
  });
});
