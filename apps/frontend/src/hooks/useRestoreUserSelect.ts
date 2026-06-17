// hooks/useRestoreUserSelect.ts
import { useEffect } from "react";

export function useRestoreUserSelect() {
  useEffect(() => {
    const handlePointerUp = (e: PointerEvent) => {
      // Give the library a chance to handle it first, then check
      // if any panel still has pointerEvents: none and force a reset
      requestAnimationFrame(() => {
        const stuckPanels = document.querySelectorAll<HTMLElement>(
          '[data-panel]'
        );
        stuckPanels.forEach((panel) => {
          if (panel.style.pointerEvents === "none") {
            panel.style.pointerEvents = "";
          }
        });
      });
    };

    // Use capture phase so we run after the library's own listeners
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerUp, true);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);
    };
  }, []);
}