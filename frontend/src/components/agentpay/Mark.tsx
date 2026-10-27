export function AgentPayMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path d="M3 10V3h7M22 3h7v7M29 22v7h-7M10 29H3v-7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 8l6 3v5c0 4-2.6 6.8-6 8-3.4-1.2-6-4-6-8v-5l6-3z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M13 16l2.2 2.2L19.5 14" stroke="var(--warning)" strokeWidth="1.8" />
    </svg>
  );
}
