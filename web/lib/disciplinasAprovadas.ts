const KEY_APROVADAS = "grade-horaria:aprovadas";

function isAprovadoOuEquivalente(situacao: string): boolean {
  const s = situacao.toLowerCase();
  return s.includes("aprovado") || s.includes("dispens");
}

export function getAprovadas(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY_APROVADAS);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function setAprovadas(
  disciplinas: Array<{ codigo: string; situacao: string; isProjecao?: boolean }>
): void {
  const codigos = disciplinas
    .filter((d) => isAprovadoOuEquivalente(d.situacao) && d.codigo && !d.isProjecao)
    .map((d) => d.codigo);
  try {
    localStorage.setItem(KEY_APROVADAS, JSON.stringify(codigos));
  } catch {
    // localStorage unavailable
  }
}

export function clearAprovadas(): void {
  try {
    localStorage.removeItem(KEY_APROVADAS);
  } catch {
    // localStorage unavailable
  }
}

export function isAprovada(codigo: string): boolean {
  return getAprovadas().has(codigo);
}
