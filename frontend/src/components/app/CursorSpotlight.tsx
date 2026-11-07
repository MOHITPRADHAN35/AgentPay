import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

export function CursorSpotlight({ children, className }: { children: ReactNode; className?: string }) {
  const glow = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const cancelFrame = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const position = (event: PointerEvent<HTMLElement>, immediate = false) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    cancelFrame();
    const update = () => {
      const layer = glow.current;
      if (!layer) return;
      layer.style.setProperty("--cursor-x", `${x}px`);
      layer.style.setProperty("--cursor-y", `${y}px`);
      section.current?.querySelectorAll<HTMLElement>(".spotlight-copy").forEach((text) => {
        const rect = text.getBoundingClientRect();
        text.style.setProperty("--text-cursor-x", `${x + bounds.left - rect.left}px`);
        text.style.setProperty("--text-cursor-y", `${y + bounds.top - rect.top}px`);
      });
      frame.current = null;
    };
    if (immediate) update();
    else frame.current = requestAnimationFrame(update);
  };

  return (
    <section ref={section} className={className} data-spotlight-active={active}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        position(event, true);
        setActive(true);
      }}
      onPointerMove={position}
      onPointerLeave={() => { cancelFrame(); setActive(false); }}
      onPointerCancel={() => { cancelFrame(); setActive(false); }}
    >
      <div ref={glow} aria-hidden="true" data-cursor-spotlight data-active={active} className="cursor-spotlight" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function SpotlightText({ as: Tag, children, className }: { as: "h1" | "p"; children: string; className?: string }) {
  return (
    <Tag className={className}>
      {children}
      <span aria-hidden="true" className="spotlight-copy">{children}</span>
    </Tag>
  );
}