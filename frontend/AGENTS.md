<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## AgentPay architecture
- Spending policy lives in pure `src/lib/policy.ts` (unit-tested) and is re-enforced atomically by the `reserve_transaction` DB function; the UI only displays server decisions.
- Prices come only from `src/lib/catalog.ts` on the server; clients send task IDs, never amounts.
- PayPal REST calls run server-side via fetch (Worker-safe); demo mode (no credentials) never writes ledger rows or shows capture IDs.
- Palette surfaces (`surface-navy`, `surface-blue`) re-scope raw tokens; custom CSS/inline styles must reference `var(--token)`, never `var(--color-token)` (that resolves at :root and ignores the surface).
