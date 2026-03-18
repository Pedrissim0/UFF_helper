const MINUSCULAS = new Set([
  "de", "da", "do", "dos", "das", "e", "em", "para", "com",
  "a", "o", "à", "ao", "às", "nos", "na", "no", "um", "uma",
]);

// Numerais romanos comuns no currículo (I–XII)
const ROMANOS = new Set([
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
]);

export function formatarNomeDisciplina(nome: string): string {
  return nome
    .split(/\s+/)
    .map((word, idx) => {
      if (!word) return word;
      // Numerais romanos permanecem em maiúsculo
      if (ROMANOS.has(word.toUpperCase())) return word.toUpperCase();
      const lower = word.toLowerCase();
      // Artigos/preposições curtas em minúsculo (exceto na primeira posição)
      if (idx > 0 && MINUSCULAS.has(lower)) return lower;
      // Title case: primeira letra maiúscula, resto minúsculo
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
