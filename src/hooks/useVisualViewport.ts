import { useState, useEffect } from "react";

/**
 * Tracks window.visualViewport height on iOS Safari.
 * When the virtual keyboard opens, visualViewport.height shrinks
 * while the layout viewport stays the same. By applying this height
 * to a container, we keep all content within the visible area.
 *
 * Returns `undefined` on browsers without visualViewport support,
 * indicating the caller should fall back to CSS viewport units.
 */
export function useVisualViewportHeight() {
  const [height, setHeight] = useState<number | undefined>(
    () => window.visualViewport?.height
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setHeight(vv.height);
    };

    // Initial
    update();

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
