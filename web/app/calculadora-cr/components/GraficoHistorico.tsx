import type { HistoricoEntry } from "../types";
import { truncateCR } from "../types";

export default function CRChart({ historico }: { historico: HistoricoEntry[] }) {
  const svgW = 244;
  const svgH = 160;
  const padL = 32;
  const padR = 8;
  const padT = 10;
  const padB = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;
  const n = historico.length;

  if (n === 0) return null;

  const crs = historico.map((h) => h.cr);
  const rawMin = Math.min(...crs);
  const rawMax = Math.max(...crs);
  const spread = rawMax - rawMin;
  const yMin = Math.max(0, rawMin - Math.max(0.4, spread * 0.25));
  const yMax = Math.min(10, rawMax + Math.max(0.4, spread * 0.25));
  const yRange = yMax - yMin || 1;

  const xOf = (i: number) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
  const yOf = (v: number) => padT + chartH - ((v - yMin) / yRange) * chartH;

  const pts = historico.map((h, i) => ({
    x: xOf(i),
    y: yOf(h.cr),
    proj: h.temProjecao,
  }));

  const projStart = historico.findIndex((h) => h.temProjecao);
  const histEnd = projStart >= 0 ? projStart : n - 1;
  const histPts = pts.slice(0, histEnd + 1);
  const projPts = projStart >= 0 ? pts.slice(projStart) : [];

  const toPath = (points: { x: number; y: number }[]) =>
    points.length < 2
      ? ""
      : points
          .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(" ");

  const nTicks = 4;
  const yTicks = Array.from(
    { length: nTicks },
    (_, i) => yMin + (yRange / (nTicks - 1)) * i
  );

  const xShow = new Set<number>([0, n - 1]);
  if (n > 2) {
    const step = Math.ceil((n - 1) / 3);
    for (let i = step; i < n - 1; i += step) xShow.add(i);
  }

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padL}
            y1={yOf(t)}
            x2={svgW - padR}
            y2={yOf(t)}
            stroke="var(--border-light)"
            strokeWidth="1"
          />
          <text
            x={padL - 4}
            y={yOf(t) + 3.5}
            textAnchor="end"
            fontSize="9"
            fill="var(--text-muted)"
          >
            {truncateCR(t)}
          </text>
        </g>
      ))}
      <line
        x1={padL}
        y1={padT + chartH}
        x2={svgW - padR}
        y2={padT + chartH}
        stroke="var(--border-medium)"
        strokeWidth="1"
      />
      {histPts.length >= 2 && (
        <path
          d={toPath(histPts)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {projPts.length >= 2 && (
        <path
          d={toPath(projPts)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="5 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3.5"
          fill={p.proj ? "#f59e0b" : "var(--accent)"}
          stroke="var(--bg-card)"
          strokeWidth="1.5"
        />
      ))}
      {pts.map((p, i) =>
        xShow.has(i) ? (
          <text
            key={i}
            x={p.x}
            y={svgH - 2}
            textAnchor="middle"
            fontSize="8.5"
            fill="var(--text-muted)"
          >
            {historico[i].periodo.slice(2)}
          </text>
        ) : null
      )}
    </svg>
  );
}
