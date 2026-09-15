import { useEffect } from "react";
import { useIsEmbedded } from "./use-embedded";

// When embedded, continuously reports this page's actual content height to
// the parent window (the shop's /konfigurator iframe wrapper) via
// postMessage, so the parent can grow the iframe to fit instead of giving
// it a fixed height with its own internal scrollbar — the "box in a box"
// look the shop's iframe otherwise has.
export function useEmbeddedAutoResize() {
  const isEmbedded = useIsEmbedded();

  useEffect(() => {
    if (!isEmbedded) return;

    const postHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage(
        { source: "novamotis-konfigurator", type: "resize", height },
        "*",
      );
    };

    postHeight();
    const raf = requestAnimationFrame(postHeight); // after first paint/layout

    const ro = new ResizeObserver(postHeight);
    ro.observe(document.documentElement);

    window.addEventListener("load", postHeight);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("load", postHeight);
    };
  }, [isEmbedded]);
}
