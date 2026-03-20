import dynamic from "next/dynamic";

const Roadmap = dynamic(() => import("./Roadmap"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh", background: "var(--bg-page)" }} />,
});

export const metadata = {
  title: "Roadmap Curricular",
  description:
    "Visualize a matriz curricular de Economia da UFF como fluxograma interativo.",
};

export default function RoadmapPage() {
  return <Roadmap />;
}
