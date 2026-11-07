import { motion } from "motion/react";
import { BadgeCheck, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/lib/agentpay/api";
import { formatUSD } from "@/lib/agentpay/policy";
import { cn } from "@/lib/utils";

export function ProductCard({ p, selected, onSelect, onCompare }: { p: Product; selected?: boolean; onSelect: () => void; onCompare: () => void }) {
  const total = p.price + (p.shipping ?? 0) + (p.tax ?? 0);
  return (
    <motion.article whileHover={{ y: -4 }} className={cn("group glass overflow-hidden rounded-xl transition-colors", selected ? "ring-2 ring-primary" : "hover:border-ring/30")}>
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {p.image ? <img src={p.image} alt={p.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-xs text-muted-foreground">Image not provided</div>}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-[11px] text-muted-foreground">{p.brand ?? "Brand not provided"} · {p.merchant}{p.verified && <BadgeCheck className="ml-1 inline size-3.5 text-success" />}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium">{p.title}</h3>
          {p.rating != null && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Star className="size-3 fill-warning text-warning" />{p.rating} ({p.reviews ?? 0})</p>}
        </div>
        <div className="flex flex-wrap gap-1">{p.specs.map((s) => <span key={s} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{s}</span>)}</div>
        <dl className="space-y-1 font-mono text-xs">
          <div className="flex justify-between"><dt className="text-muted-foreground">Price</dt><dd>{formatUSD(p.price, p.currency)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{p.shipping != null ? formatUSD(p.shipping) : "Not provided"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd>{p.tax != null ? `${formatUSD(p.tax)} est.` : "Estimate"}</dd></div>
          <div className="flex justify-between border-t border-glass-border pt-1 font-semibold"><dt>Est. total</dt><dd>{formatUSD(total, p.currency)}</dd></div>
        </dl>
        <p className="text-[11px] text-muted-foreground">{p.availability ?? "Availability not provided"}</p>
        <div className="flex gap-2">
          {p.merchantUrl && <Button variant="ghost" size="icon" asChild><a href={p.merchantUrl} target="_blank" rel="noreferrer" aria-label="View merchant website"><ExternalLink /></a></Button>}
          <Button variant="glass" size="sm" onClick={onCompare} className="flex-1">Compare</Button>
          <Button variant="brand" size="sm" onClick={onSelect} className="flex-1">Select & Authorize</Button>
        </div>
      </div>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="glass overflow-hidden rounded-xl">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-1/3" /><Skeleton className="h-4 w-4/5" />
        <div className="flex gap-1"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-14" /><Skeleton className="h-4 w-10" /></div>
        <Skeleton className="h-16 w-full" /><Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}
