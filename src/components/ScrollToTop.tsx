import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

const YM_ID = 108988230;

const ScrollToTop = () => {
  const { pathname, hash, search } = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    // If there's a hash, scroll to that element
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }

    // Yandex.Metrika SPA pageview tracking.
    // Skip the very first navigation — initial load is auto-tracked by the counter.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    try {
      if (typeof window.ym === "function") {
        window.ym(YM_ID, "hit", window.location.href, {
          referer: document.referrer,
          title: document.title,
        });
      }
    } catch {
      // ignore
    }
  }, [pathname, hash, search]);

  return null;
};

export default ScrollToTop;
