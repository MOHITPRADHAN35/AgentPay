import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "./index";
import { budgetQuery } from "@/lib/agentpay/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — AgentPay 2.0" },
    { name: "description", content: "Direct access to your AgentPay commerce dashboard, financial policy and agent activity." },
    { property: "og:title", content: "Dashboard — AgentPay 2.0" },
    { property: "og:description", content: "Your AgentPay command center for procurement, spending limits and payment approval." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(budgetQuery),
  component: () => <Overview directDashboard />,
});