import { useState, useEffect, useCallback } from "react";

interface ViewportState {
  height: number;
  offsetTop: number;
}

/**
 * Tracks window.visualViewport on iOS Safari.
 * Returns both height and offsetTop so we can reposition
 * the UI to follow the visual viewport when the keyboard opens.
 *
 * On iOS Safari, when the keyboard opens:
 * - visualViewport.height shrinks
 * - visualViewport.offsetTop increases (page scrolled up)
 *
 * By applying transform: translateY(offsetTop) + height to a container,
 * we can keep it pinned to the visible area.
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
