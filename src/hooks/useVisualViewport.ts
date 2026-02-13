import { useState, useEffect, useCallback } from "react";

interface ViewportState {
  height: number;
  offsetTop: number;
}

/**
 * Tracks window.visualViewport on iOS Safari.
 * 
 * When the keyboard opens on iOS Safari, the browser scrolls the layout
 * viewport, which moves `position: fixed` elements out of view.
 * 
 * This hook:
 * 1. Tracks the visual viewport height (shrinks when keyboard opens)
 * 2. Forces window.scrollTo(0,0) on every viewport change to prevent
 *    Safari from scrolling fixed elements away
 */
export function useVisualViewport() {
  const [state, setState] = useState<ViewportState>(() => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetTop: window.visualViewport?.offsetTop ?? 0,
  }));

  const update = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    
    // Force scroll to top to prevent Safari from scrolling
    // fixed elements out of view when keyboard opens
    if (vv.offsetTop > 0) {
      window.scrollTo(0, 0);
    }
    
    setState({
      height: vv.height,
      offsetTop: vv.offsetTop,
    });
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    update();

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [update]);

  return state;
}

// Keep backward compat export
export function useVisualViewportHeight() {
  const { height } = useVisualViewport();
  return height;
}
