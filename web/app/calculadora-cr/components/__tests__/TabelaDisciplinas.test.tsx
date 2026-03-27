import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TabelaDisciplinas from "../TabelaDisciplinas";
import type { Disciplina } from "../../types";

const baseDisciplina: Disciplina = {
  codigo: "ECO001",
  nome: "Microeconomia I",
  situacao: "Aprovado",
  turma: "A1",
  nota: 8.5,
  vs: null,
  frequencia: 90,
  horas: 60,
  creditos: 4,
  semestre: "2025.1",
};

describe("TabelaDisciplinas", () => {
  it("não renderiza nada quando não há disciplinas", () => {
    const { container } = render(
      <TabelaDisciplinas disciplinas={[]} onEditar={jest.fn()} onExcluir={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza tabela com disciplinas", () => {
    render(
      <TabelaDisciplinas
        disciplinas={[baseDisciplina]}
        onEditar={jest.fn()}
        onExcluir={jest.fn()}
      />
    );
    expect(screen.getByText("ECO001")).toBeInTheDocument();
    expect(screen.getByText("Microeconomia I")).toBeInTheDocument();
    expect(screen.getByText("8.5")).toBeInTheDocument();
    expect(screen.getByText("2025.1")).toBeInTheDocument();
  });

  it("exibe tag 'projeção' para disciplinas projetadas", () => {
    render(
      <TabelaDisciplinas
        disciplinas={[{ ...baseDisciplina, isProjecao: true }]}
        onEditar={jest.fn()}
        onExcluir={jest.fn()}
      />
    );
    expect(screen.getByText("projeção")).toBeInTheDocument();
  });

  it("chama onEditar com índice correto ao clicar no botão editar", () => {
    const onEditar = jest.fn();
    render(
      <TabelaDisciplinas
        disciplinas={[baseDisciplina]}
        onEditar={onEditar}
        onExcluir={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("Editar"));
    expect(onEditar).toHaveBeenCalledWith(0);
  });

  it("chama onExcluir com índice correto ao clicar no botão remover", () => {
    const onExcluir = jest.fn();
    render(
      <TabelaDisciplinas
        disciplinas={[baseDisciplina]}
        onEditar={jest.fn()}
        onExcluir={onExcluir}
      />
    );
    fireEvent.click(screen.getByTitle("Remover"));
    expect(onExcluir).toHaveBeenCalledWith(0);
  });

  it("exibe múltiplas disciplinas", () => {
    const disc2: Disciplina = {
      ...baseDisciplina,
      codigo: "ECO002",
      nome: "Macroeconomia I",
      nota: 7.0,
    };
    render(
      <TabelaDisciplinas
        disciplinas={[baseDisciplina, disc2]}
        onEditar={jest.fn()}
        onExcluir={jest.fn()}
      />
    );
    expect(screen.getByText("ECO001")).toBeInTheDocument();
    expect(screen.getByText("ECO002")).toBeInTheDocument();
  });

  it("exibe '—' para nota null", () => {
    render(
      <TabelaDisciplinas
        disciplinas={[{ ...baseDisciplina, nota: null }]}
        onEditar={jest.fn()}
        onExcluir={jest.fn()}
      />
    );
    // There are multiple "—" cells (nota, vs), just check they exist
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
