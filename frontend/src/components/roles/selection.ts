import { useEffect, useRef, useState } from "react";

/**
 * Master-detail selection for the internal inbox screens. The detail is a DetailPane: sticky beside the list on wide
 * screens, a pop-up (sheet) on narrower ones. Selecting a record opens the sheet (`sheet`), moves focus to the detail
 * heading and, when the detail is below the visible area, scrolls it into view. The initial selection only fills the
 * wide panel; it never opens a sheet by itself.
 */
export function useSelection(initial: string | null) {
  const [selected, setSelected] = useState(initial);
  const [tick, setTick] = useState(0);
  const [sheet, setSheet] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const heading = headingRef.current;
    if (tick === 0 || !heading) return;
    heading.focus({ preventScroll: true });
    const panel = heading.closest<HTMLElement>("[data-block]") ?? heading;
    const box = panel.getBoundingClientRect();
    if (box.top > window.innerHeight * 0.7 || box.bottom < 0) panel.scrollIntoView({ block: "start" });
  }, [tick]);
  return {
    selected, headingRef, sheet, closeSheet: () => setSheet(false),
    select: (key: string) => { setSelected(key); setSheet(true); setTick((n) => n + 1); },
  };
}
