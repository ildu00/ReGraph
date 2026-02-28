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
    
    setState({
      height: vv.height,
      offsetTop: vv.offsetTop,
    });

    // When keyboard opens/closes on iOS Safari, force scroll to top so
    // fixed-position elements stay visible. This runs only on 'resize'
    // (keyboard open/close), NOT on 'scroll', so it won't fight the user
    // scrolling content on non-chat tabs.
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    update();

    // Only listen to 'resize' (keyboard open/close changes viewport height).
    // Removing the 'scroll' listener prevents Safari from auto-scrolling to
    // the top when the user scrolls content on non-chat tabs.
    vv.addEventListener("resize", update);

    return () => {
      vv.removeEventListener("resize", update);
    };
  }, [update]);

  return state;
}

// Keep backward compat export
export function useVisualViewportHeight() {
  const { height } = useVisualViewport();
  return height;
}
