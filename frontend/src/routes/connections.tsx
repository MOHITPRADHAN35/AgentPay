import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Reveal } from "@/components/app/primitives";
import { ServiceList } from "@/components/app/SetupDialog";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [
      { title: "API Connections — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Connection status for PayPal Sandbox, SerpApi, Groq and the database." },
      { property: "og:title", content: "API Connections — AgentPay 2.0" },
      { property: "og:description", content: "AgentPay service connection health." },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="System health" title="API connections" description="What AgentPay needs to run real procurements. Secrets are never shown here." />
      <Reveal><ServiceList /></Reveal>
    </div>
  ),
});
