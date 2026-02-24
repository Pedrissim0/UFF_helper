import { useState, useMemo } from "react";

const SAMPLE_MATERIAS = [
  { codigo: "GGE00125", nome: "A GEOGRAFIA DOS BLOCOS MUNDIAIS DO PODER", turma: "A1", modulo: 60, tipo: "Presencial", seg: "18:00-22:00", ter: "", qua: "", qui: "", sex: "", sab: "" },
  { codigo: "GGE00125", nome: "A GEOGRAFIA DOS BLOCOS MUNDIAIS DO PODER", turma: "J1", modulo: 62, tipo: "Presencial", seg: "", ter: "", qua: "18:00-22:00", qui: "", sex: "", sab: "" },
  { codigo: "STA00160", nome: "ADMINISTRAÇÃO PÚBLICA", turma: "P1", modulo: 83, tipo: "Presencial", seg: "", ter: "", qua: "", qui: "18:00-22:00", sex: "", sab: "" },
  { codigo: "SEN00191", nome: "ALOCAÇÃO DE ATIVOS DE RISCO", turma: "P1", modulo: 50, tipo: "Presencial", seg: "", ter: "", qua: "", qui: "", sex: "18:00-22:00", sab: "" },
  { codigo: "STC00116", nome: "ANÁLISE DE BALANÇO", turma: "P2", modulo: 60, tipo: "Presencial", seg: "", ter: "", qua: "18:00-22:00", qui: "", sex: "", sab: "" },
  { codigo: "SEN00214", nome: "ANÁLISE DE SÉRIES TEMPORAIS I", turma: "A1", modulo: 50, tipo: "Presencial", seg: "", ter: "", qua: "", qui: "", sex: "", sab: "09:00-13:00" },
  { codigo: "ECO00101", nome: "MICROECONOMIA I", turma: "A1", modulo: 60, tipo: "Presencial", seg: "14:00-18:00", ter: "", qua: "", qui: "", sex: "", sab: "" },
  { codigo: "ECO00102", nome: "MACROECONOMIA I", turma: "B1", modulo: 60, tipo: "Presencial", seg: "", ter: "18:00-22:00", qua: "", qui: "", sex: "", sab: "" },
  { codigo: "MAT00210", nome: "CÁLCULO DIFERENCIAL E INTEGRAL I", turma: "C1", modulo: 90, tipo: "Presencial", seg: "", ter: "", qua: "", qui: "14:00-18:00", sex: "", sab: "" },
  { codigo: "EST00115", nome: "ESTATÍSTICA ECONÔMICA", turma: "A2", modulo: 60, tipo: "Presencial", seg: "", ter: "", qua: "", qui: "", sex: "14:00-18:00", sab: "" },
];

const DAYS = ["seg", "ter", "qua", "qui", "sex", "sab"];
const DAY_LABELS = { seg: "SEG", ter: "TER", qua: "QUA", qui: "QUI", sex: "SEX", sab: "SÁB" };

const PALETTE = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#0ea5e9", "#f97316", "#14b8a6", "#ec4899", "#84cc16",
];

function parseTime(str) {
  if (!str) return null;
  const [start, end] = str.split("-");
  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return { start: toMin(start), end: toMin(end), label: str };
}

const MIN_TIME = 7 * 60;
const MAX_TIME = 23 * 60;
const TOTAL = MAX_TIME - MIN_TIME;

function toPercent(min) {
  return ((min - MIN_TIME) / TOTAL) * 100;
}

const HOUR_MARKS = [8, 10, 12, 14, 16, 18, 20, 22];

export default function GradeHoraria() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  const colorMap = useMemo(() => {
    const map = {};
    let i = 0;
    SAMPLE_MATERIAS.forEach((m) => {
      const key = `${m.codigo}-${m.turma}`;
      if (!map[key]) map[key] = PALETTE[i++ % PALETTE.length];
    });
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SAMPLE_MATERIAS.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        m.codigo.toLowerCase().includes(q) ||
        m.turma.toLowerCase().includes(q)
    );
  }, [search]);

  const isSelected = (m) => selected.some((s) => s.codigo === m.codigo && s.turma === m.turma);

  const hasConflict = (candidate) => {
    for (const day of DAYS) {
      const t1 = parseTime(candidate[day]);
      if (!t1) continue;
      for (const s of selected) {
        if (s.codigo === candidate.codigo && s.turma === candidate.turma) continue;
        const t2 = parseTime(s[day]);
        if (!t2) continue;
        if (t1.start < t2.end && t1.end > t2.start) return true;
      }
    }
    return false;
  };

  const toggle = (m) => {
    if (isSelected(m)) {
      setSelected((prev) => prev.filter((s) => !(s.codigo === m.codigo && s.turma === m.turma)));
    } else {
      setSelected((prev) => [...prev, m]);
    }
  };

  const totalHoras = selected.reduce((acc, m) => acc + m.modulo, 0);

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#fafafa",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
        .materia-row { transition: background 0.12s; cursor: pointer; }
        .materia-row:hover { background: #f0f0f0 !important; }
        .materia-row.selected-row { background: #f5f3ff !important; }
        .materia-row.conflict-row { opacity: 0.4; cursor: not-allowed; }
        .search-input:focus { outline: none; border-color: #6366f1 !important; }
        .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; letter-spacing: 0.02em; }
        .block { position: absolute; left: 2px; right: 2px; border-radius: 4px; padding: 4px 6px; font-size: 10px; font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; transition: opacity 0.15s; }
        .block:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "24px 32px 0", borderBottom: "1px solid #e8e8e8", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <span style={{ fontFamily: "'DM Mono'", fontSize: 11, color: "#aaa", letterSpacing: "0.12em" }}>ECONOMIA · 2025.1</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", letterSpacing: "-0.02em", marginBottom: 20 }}>
          Montador de Grade
        </h1>
        <div style={{ display: "flex", gap: 24 }}>
          {["Matérias", "Grade"].map((tab, i) => (
            <div key={tab} style={{
              paddingBottom: 12,
              fontSize: 13,
              fontWeight: 500,
              color: i === 0 ? "#1a1a1a" : "#aaa",
              borderBottom: i === 0 ? "2px solid #1a1a1a" : "2px solid transparent",
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}>{tab}</div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 97px)" }}>

        {/* Left panel */}
        <div style={{ width: 340, borderRight: "1px solid #e8e8e8", background: "#fff", display: "flex", flexDirection: "column" }}>

          {/* Search */}
          <div style={{ padding: "16px 16px 12px" }}>
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código ou turma..."
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                border: "1px solid #e4e4e4",
                borderRadius: 6,
                background: "#fafafa",
                color: "#1a1a1a",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Status bar */}
          <div style={{
            padding: "0 16px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'DM Mono'" }}>
              {filtered.length} turmas · {selected.length} selecionadas
            </span>
            {selected.length > 0 && (
              <span
                onClick={() => setSelected([])}
                style={{ fontSize: 11, color: "#6366f1", cursor: "pointer", fontWeight: 500 }}
              >
                Limpar
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map((m) => {
              const key = `${m.codigo}-${m.turma}`;
              const sel = isSelected(m);
              const conflict = !sel && hasConflict(m);
              const color = colorMap[key];
              const activeDays = DAYS.filter((d) => m[d]);

              return (
                <div
                  key={key}
                  className={`materia-row${sel ? " selected-row" : ""}${conflict ? " conflict-row" : ""}`}
                  onClick={() => !conflict && toggle(m)}
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    background: sel ? "" : "#fff",
                  }}
                >
                  {/* Color dot / checkbox */}
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    marginTop: 2,
                    flexShrink: 0,
                    border: sel ? "none" : "1.5px solid #ddd",
                    background: sel ? color : "transparent",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {sel && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.nome.length > 38 ? m.nome.slice(0, 38) + "…" : m.nome}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                      <span className="chip" style={{ background: "#f4f4f5", color: "#666" }}>
                        {m.codigo}
                      </span>
                      <span className="chip" style={{ background: sel ? color + "22" : "#f4f4f5", color: sel ? color : "#666" }}>
                        T. {m.turma}
                      </span>
                      <span className="chip" style={{ background: "#f4f4f5", color: "#888" }}>
                        {m.modulo}h
                      </span>
                      {activeDays.map((d) => (
                        <span key={d} className="chip" style={{ background: "#f4f4f5", color: "#888" }}>
                          {DAY_LABELS[d]} {m[d].split("-")[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid #e8e8e8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{ fontSize: 12, color: "#888" }}>Total selecionado</span>
              <span style={{ fontFamily: "'DM Mono'", fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>
                {totalHoras}h
              </span>
            </div>
          )}
        </div>

        {/* Grade */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: "24px 28px" }}>
          {selected.length === 0 ? (
            <div style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}>
              <div style={{ fontSize: 32 }}>📅</div>
              <div style={{ fontSize: 14, color: "#bbb", fontWeight: 500 }}>Selecione matérias para visualizar a grade</div>
              <div style={{ fontSize: 12, color: "#ccc" }}>Os conflitos de horário serão destacados automaticamente</div>
            </div>
          ) : (
            <div style={{ minWidth: 520 }}>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "52px repeat(6, 1fr)", gap: 0, marginBottom: 0 }}>
                <div />
                {DAYS.map((d) => (
                  <div key={d} style={{
                    textAlign: "center",
                    fontSize: 10,
                    fontFamily: "'DM Mono'",
                    fontWeight: 500,
                    color: "#bbb",
                    letterSpacing: "0.1em",
                    paddingBottom: 10,
                  }}>
                    {DAY_LABELS[d]}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "52px repeat(6, 1fr)", gap: 0 }}>
                {/* Time axis */}
                <div style={{ position: "relative", height: 560 }}>
                  {HOUR_MARKS.map((h) => (
                    <div key={h} style={{
                      position: "absolute",
                      top: `${toPercent(h * 60)}%`,
                      right: 8,
                      fontSize: 9,
                      fontFamily: "'DM Mono'",
                      color: "#ccc",
                      transform: "translateY(-50%)",
                    }}>
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map((day) => (
                  <div key={day} style={{
                    position: "relative",
                    height: 560,
                    borderLeft: "1px solid #f0f0f0",
                  }}>
                    {/* Hour lines */}
                    {HOUR_MARKS.map((h) => (
                      <div key={h} style={{
                        position: "absolute",
                        top: `${toPercent(h * 60)}%`,
                        left: 0,
                        right: 0,
                        borderTop: "1px dashed #f0f0f0",
                      }} />
                    ))}

                    {/* Blocks */}
                    {selected
                      .filter((m) => m[day])
                      .map((m) => {
                        const key = `${m.codigo}-${m.turma}`;
                        const time = parseTime(m[day]);
                        if (!time) return null;
                        const top = toPercent(time.start);
                        const height = toPercent(time.end) - top;
                        const color = colorMap[key];
                        return (
                          <div
                            key={key}
                            className="block"
                            style={{
                              top: `${top}%`,
                              height: `${height}%`,
                              background: color + "18",
                              borderLeft: `3px solid ${color}`,
                              color: color,
                            }}
                          >
                            <div style={{ fontSize: 9, fontFamily: "'DM Mono'", opacity: 0.7 }}>{time.label}</div>
                            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 1 }}>
                              {m.nome.split(" ").slice(0, 3).join(" ")}
                            </div>
                            <div style={{ fontSize: 9, opacity: 0.7 }}>T. {m.turma}</div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
