import { FloatingCutie } from "@/components/ui/FloatingCutie";

export function ScatterSection() {
  return (
    <section
      className="landing-section relative h-64 overflow-hidden"
      data-testid="lp-scatter"
    >
      <FloatingCutie kind="heart" x="10%" y="20%" size={60} rotate={-8} />
      <FloatingCutie
        kind="star"
        x="40%"
        y="60%"
        size={50}
        rotate={12}
        delay="0.4s"
      />
      <FloatingCutie
        kind="bow"
        x="70%"
        y="30%"
        size={70}
        rotate={-4}
        delay="0.8s"
        color="var(--pink)"
      />
      <FloatingCutie
        kind="plus"
        x="85%"
        y="70%"
        size={45}
        rotate={20}
        delay="1.2s"
      />
    </section>
  );
}
