import { FloatingCutie } from "@/components/ui/FloatingCutie";
import { Sparkle } from "@/components/ui/Sparkle";

export function ScatterSection() {
  return (
    <section
      className="landing-section relative h-72 overflow-hidden"
      data-testid="lp-scatter"
    >
      <FloatingCutie kind="heart" x="6%" y="14%" size={70} rotate={-10} />
      <FloatingCutie
        kind="star"
        x="22%"
        y="64%"
        size={55}
        rotate={14}
        delay="0.4s"
        color="var(--accent-c)"
      />
      <FloatingCutie
        kind="cloud"
        x="38%"
        y="22%"
        size={90}
        rotate={-2}
        delay="0.8s"
      />
      <FloatingCutie
        kind="bow"
        x="52%"
        y="58%"
        size={60}
        rotate={6}
        delay="1.2s"
        color="var(--accent-b)"
      />
      <FloatingCutie
        kind="plus"
        x="68%"
        y="18%"
        size={50}
        rotate={20}
        delay="0.2s"
        color="var(--accent-a)"
      />
      <FloatingCutie
        kind="heart"
        x="82%"
        y="52%"
        size={65}
        rotate={-12}
        delay="1.6s"
        color="var(--pink-2)"
      />
      <FloatingCutie
        kind="star"
        x="92%"
        y="14%"
        size={45}
        rotate={28}
        delay="0.6s"
      />
      <Sparkle style={{ top: "30%", left: "14%" }} delay={0.3} size={18} />
      <Sparkle style={{ top: "70%", left: "36%" }} delay={1.1} />
      <Sparkle style={{ top: "20%", right: "20%" }} delay={0.7} />
      <Sparkle style={{ top: "80%", right: "10%" }} delay={1.4} size={16} />
    </section>
  );
}
