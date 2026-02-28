import { useState, useEffect, useCallback } from "react";

interface ViewportState {
  height: number;
  offsetTop: number;
}

/**
 * Tracks window.visualViewport on iOS Safari.
 *
 * Pass `active = true` when the chat/claw mobile UI is open.
 * In active mode:
 *  - Both 'resize' and 'scroll' events are handled
 *  - scrollTo(0,0) is forced when offsetTop > 0 to keep fixed elements in view
 * In inactive mode (other tabs):
 *  - Only 'resize' is handled, no forced scroll (prevents auto-scroll-to-top bug)
 */
export function useVisualViewport(active = false) {
  const [state, setState] = useState<ViewportState>(() => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetTop: window.visualViewport?.offsetTop ?? 0,
  }));

  const update = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    setState({ height: vv.height, offsetTop: vv.offsetTop });

    // Only force scroll-to-top in active (chat/claw) mode to counteract
    // iOS Safari scrolling the layout viewport when the keyboard opens.
    if (active && vv.offsetTop > 0) {
      window.scrollTo(0, 0);
    }
  }, [active]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    update();

    vv.addEventListener("resize", update);
    // Scroll listener only in active mode to avoid fighting user scroll elsewhere
    if (active) vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      if (active) vv.removeEventListener("scroll", update);
    };
  }, [update, active]);

  return state;
}

// Keep backward compat export
export function useVisualViewportHeight() {
  const { height } = useVisualViewport();
  return height;
}
