# Plano de Execução — Parse da Matriz Curricular

**Status:** Em progresso (interruído por limite de tokens)

## Progresso Concluído

### ✅ 1. Requirements.txt
- Adicionado `pdfplumber` (substituindo Docling por ser mais leve)
- Instalado com sucesso

### ✅ 2. parse_matriz.py (PARCIAL)
- Arquivo criado: `scraper/parse_matriz.py`
- Versão inicial usa text extraction (problemática com colunas intercaladas)
- **NECESSÁRIO REFATORAR** para usar `extract_tables()` do pdfplumber
- Teste inicial: extraiu 296 disciplinas mas com erros

### Diagnóstico pdfplumber:
- **`extract_text()`**: Colunas intercaladas, co-requisitos misturam com próxima disciplina ❌
- **`extract_tables()`**: Retorna 11 colunas limpas (Código, Nome, Tipo, CHT, CHP, CHEs, CHTotal, CHEx, CHPre-Req, Pré-requisitos, Co-requisitos) ✅

**Período detection:**
- Página 1: 1º período (1 tabela)
- Página 2: 2º e 3º períodos (2 tabelas)
- Página 3: 4º período (2 tabelas)
- Página 4: 5º e 6º períodos (3 tabelas)
- Página 5: 7º e 8º períodos + "Não periodizada" (3 tabelas)
- Páginas 6+: Optativas sem período

## Próximas Tarefas

### 2. REFATORAR parse_matriz.py
Use `extract_tables()` com período tracking:

```python
def run():
    pdf_path = ROOT / "docs" / "matriz_curricular" / "MatrizCurricular2026_1771898812687.pdf"
    out_path = ROOT / "docs" / "matriz_curricular" / "matriz_curricular.json"

    import pdfplumber
    lines_all = []

    with pdfplumber.open(str(pdf_path)) as pdf:
        current_periodo = None

        for page_idx, page in enumerate(pdf.pages):
            # Detecta período no texto da página
            text = page.extract_text() or ""

            # Atualiza período
            period_match = re.search(r'(\d+)[ºo°]\s*per[ií]odo', text, re.IGNORECASE)
            if period_match:
                current_periodo = int(period_match.group(1))

            if 'Não periodizada' in text:
                current_periodo = None

            # Extrai tabelas
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row or not row[0] or row[0].strip() == 'Código':
                        continue  # Skip header

                    codigo = row[0].strip()
                    if not re.match(r'^[A-Z]{2,3}\d{5}$', codigo):
                        continue  # Skip non-code rows

                    nome = (row[1] or '').strip()
                    tipo_raw = (row[2] or '').strip()
                    prereq_text = (row[9] or '') + ' ' + (row[10] or '')

                    # Parse
                    tipo = 'obrigatoria' if tipo_raw == 'OB' else 'optativa'
                    prereqs = re.findall(r'\[(?:\d+|Não Periodizada)\s*-\s*([A-Z]{2,3}\d{5})\]', prereq_text)

                    lines_all.append({
                        'codigo': codigo,
                        'nome': nome,
                        'periodo': current_periodo,
                        'tipo': tipo,
                        'prerequisitos': list(dict.fromkeys(prereqs))
                    })

    # Deduplica
    seen = set()
    unique = []
    for d in lines_all:
        if d['codigo'] not in seen:
            seen.add(d['codigo'])
            unique.append(d)

    # Salva
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', encoding='utf-8') as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)

    print(f"  {len(unique)} disciplinas -> {out_path.name}")
    return unique
```

### 3. create scraper/enrich_materias.py
Lê `matriz_curricular.json` e adiciona período, tipo, prerequisitos a `web/data/materias.json`:

```python
def run():
    web_json = ROOT / "web" / "data" / "materias.json"
    matriz_json = ROOT / "docs" / "matriz_curricular" / "matriz_curricular.json"

    with web_json.open() as f:
        materias = json.load(f)

    with matriz_json.open() as f:
        matriz = json.load(f)

    # Índice por código
    matriz_map = {d['codigo']: d for d in matriz}

    # Merge
    for m in materias:
        if m['codigo'] in matriz_map:
            d = matriz_map[m['codigo']]
            m['periodo'] = d['periodo']
            m['tipo'] = d['tipo']
            m['prerequisitos'] = d['prerequisitos']
        else:
            m['periodo'] = None
            m['tipo'] = 'optativa'
            m['prerequisitos'] = []

    with web_json.open('w', encoding='utf-8') as f:
        json.dump(materias, f, ensure_ascii=False, indent=2)

    print(f"  {len(materias)} matérias enriquecidas")
```

### 4. Update web/app/page.tsx
Adicionar ao interface `Materia`:
```typescript
periodo: number | null;
tipo: "obrigatoria" | "optativa";
prerequisitos: string[];
```

### 5. Update web/app/components/GradeHoraria.tsx
Adicionar grouping por período + badges:

```typescript
const periodoGroups = useMemo(() => {
  const groups: Map<number | null, Materia[]> = new Map();
  filtradas.forEach((m) => {
    const key = m.periodo;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a - b))
    .map(([periodo, materias]) => ({ periodo, materias }));
}, [filtradas]);
```

Renderizar com separadores:
```tsx
<ul className={styles.lista}>
  {periodoGroups.map(({ periodo, materias }) => (
    <React.Fragment key={periodo ?? 'sem'}>
      <li className={styles.periodSeparator}>
        {periodo ? `${periodo}° Período` : 'Optativas'}
      </li>
      {materias.map((m) => (
        // ... existing card code
      ))}
    </React.Fragment>
  ))}
</ul>
```

Adicionar badge dentro do card:
```tsx
<span className={`${styles.tipoBadge} ${m.tipo === 'obrigatoria' ? styles.tipoBadgeObrigatoria : styles.tipoBadgeOptativa}`}>
  {m.tipo === 'obrigatoria' ? 'Obrig.' : 'Opt.'}
</span>
```

### 6. Update web/app/components/GradeHoraria.module.css
Adicionar:
```css
.periodSeparator {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 4px;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #888;
}

.periodSeparator::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e4e4e4;
}

.tipoBadge {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
}

.tipoBadgeObrigatoria {
  background: #dbeafe;
  color: #2563eb;
}

.tipoBadgeOptativa {
  background: #f0fdf4;
  color: #16a34a;
}
```

### 7. Update scraper/scrape_uff.py
Adicionar ao pipeline (após `scrape_ch.run()`):
```python
from parse_matriz import run as parse_matriz_run
from enrich_materias import run as enrich_run

parse_matriz_run()
enrich_run()
```

### 8. Verificação
```bash
cd /web && npm run build  # deve passar sem erros
npm run dev              # verificar agrupamento por período e badges
```

## Notas Importantes
- `extract_tables()` funciona muito melhor que `extract_text()`
- Período é detectado no texto da página ANTES das tabelas
- Múltiplos períodos aparecem em várias páginas (ex: página 2 tem 2º e 3º)
- Co-requisitos estão na coluna 10 (não usar como prereq)
- Deduplicação por `codigo` é necessária
