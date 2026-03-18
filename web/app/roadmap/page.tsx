import dynamic from "next/dynamic";

const Roadmap = dynamic(() => import("./Roadmap"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)" }} />
  ),
});

export const metadata = {
  title: "Roadmap Curricular | UFF Economia",
};

export default function RoadmapPage() {
  return <Roadmap />;
}
