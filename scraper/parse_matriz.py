"""
parse_matriz.py — extrai dados da Matriz Curricular (PDF) para JSON.
Usa Claude Haiku 4.5 (via API Anthropic) para leitura inteligente do PDF.

Gera docs/matriz_curricular/matriz_curricular.json com:
  - Metadados do currículo (faculdade, cargas horárias, nº currículo)
  - Lista de disciplinas com codigo, nome, periodo, tipo,
    prerequisitos e corequisitos
"""

import base64
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent.parent

SYSTEM_PROMPT = """\
Você é um extrator preciso de dados de matrizes curriculares universitárias.
Sua saída deve ser EXCLUSIVAMENTE um objeto JSON MINIFICADO (sem espaços, \
sem quebras de linha), sem markdown, sem texto extra.

Schema de saída:
{
  "nome_faculdade": "FACULDADE DE ECONOMIA",
  "numero_curriculo": "1234567890",
  "horas_obrigatorias": 2400,
  "carga_horaria_total": 3000,
  "disciplinas": [
    {
      "codigo": "ECO00101",
      "nome": "MICROECONOMIA I",
      "periodo": 1,
      "tipo": "obrigatoria",
      "prerequisitos": ["ECO00099"],
      "corequisitos": []
    }
  ]
}

Regras:
- "nome_faculdade": nome da faculdade/curso conforme aparece no documento
- "numero_curriculo": identificador/código do currículo (string)
- "horas_obrigatorias": total de horas obrigatórias (inteiro, ou null se não encontrado)
- "carga_horaria_total": carga horária total do curso (inteiro, ou null se não encontrado)
- "codigo": letras maiúsculas + dígitos (ex: ECO00101)
- "nome": nome completo da disciplina em maiúsculas
- "periodo": inteiro 1-10, ou null se não periodizada
- "tipo": "obrigatoria" (OB) ou "optativa" (OP)
- "prerequisitos": lista de códigos pré-requisito; [] se nenhum
- "corequisitos": lista de códigos co-requisito; [] se nenhum
- Saída MINIFICADA: sem espaços após ":" e ",", sem newlines
"""

USER_PROMPT = """\
Extraia TODOS os dados desta matriz curricular, incluindo os metadados do curso \
(nome da faculdade, número do currículo, cargas horárias) e TODAS as disciplinas.
Retorne SOMENTE o objeto JSON minificado (uma única linha), sem nenhum texto adicional.
"""


def _strip_markdown_fence(text: str) -> str:
    """Remove code fences que o modelo pode adicionar mesmo sendo instruído a não."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if "```" in text:
            text = text.rsplit("```", 1)[0]
    return text.strip()


def run():
    pdf_path = (
        ROOT
        / "docs"
        / "matriz_curricular"
        / "MatrizCurricular2026_1771898812687.pdf"
    )
    out_path = ROOT / "docs" / "matriz_curricular" / "matriz_curricular.json"

    # Carrega variáveis de ambiente do .env (se existir)
    env_file = ROOT / ".env"
    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file)
        except ImportError:
            pass  # python-dotenv opcional; a variável pode já estar no ambiente

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERRO: ANTHROPIC_API_KEY não definida. Adicione ao .env ou exporte no shell.")
        sys.exit(1)

    try:
        import anthropic
    except ImportError:
        print("ERRO: pacote 'anthropic' não instalado. Rode: pip install anthropic")
        sys.exit(1)

    if not pdf_path.exists():
        print(f"ERRO: PDF não encontrado: {pdf_path}")
        sys.exit(1)

    print(f"  Lendo {pdf_path.name}...")
    pdf_b64 = base64.standard_b64encode(pdf_path.read_bytes()).decode("utf-8")

    print("  Enviando para Claude Haiku 4.5...")
    client = anthropic.Anthropic(api_key=api_key)

    raw_parts: list[str] = []
    with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=64000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": USER_PROMPT,
                    },
                ],
            }
        ],
    ) as stream:
        for text in stream.text_stream:
            raw_parts.append(text)

    raw = _strip_markdown_fence("".join(raw_parts))

    try:
        result: dict = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"ERRO: resposta do Claude não é JSON válido: {e}")
        print("Primeiros 500 chars da resposta:")
        print(raw[:500])
        sys.exit(1)

    disciplinas: list[dict] = result.get("disciplinas", [])

    # Deduplica por código (mantém primeira ocorrência)
    seen: set[str] = set()
    unique = []
    for d in disciplinas:
        codigo = d.get("codigo", "")
        if codigo and codigo not in seen:
            seen.add(codigo)
            unique.append(d)

    result["disciplinas"] = unique

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    obr = sum(1 for d in unique if d.get("tipo") == "obrigatoria")
    opt = sum(1 for d in unique if d.get("tipo") == "optativa")
    print(f"  Faculdade : {result.get('nome_faculdade', '?')}")
    print(f"  Currículo : {result.get('numero_curriculo', '?')}")
    print(f"  CH Total  : {result.get('carga_horaria_total', '?')}h")
    print(f"  CH Obrig. : {result.get('horas_obrigatorias', '?')}h")
    print(f"  Disciplinas: {len(unique)} ({obr} obrig., {opt} opt.) -> {out_path.name}")

    return result


def main():
    run()


if __name__ == "__main__":
    main()
