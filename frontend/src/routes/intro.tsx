import { createFileRoute } from "@tanstack/react-router";
import { CinematicIntro } from "@/components/app/CinematicIntro";

export const Route = createFileRoute("/intro")({
  head: () => ({ meta: [
    { title: "AgentPay 2.0 — Intelligence With Boundaries" },
    { name: "description", content: "Explore AgentPay's five-agent commerce workflow, financial guardrails and human-controlled PayPal authorization." },
    { property: "og:title", content: "AgentPay 2.0 — Intelligence With Boundaries" },
    { property: "og:description", content: "Delegate the work. Control the money. Discover the AgentPay autonomous commerce system." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CinematicIntro,
});