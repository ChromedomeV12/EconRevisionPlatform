/* Runs before styles: geometry is available before the app or first paint. */
(() => {
  "use strict";
  function choose(width, height) {
    return width < 600 || (width < 1000 && (width / height < 1.2 || height <= 500)) ? "swipe" : "desktop";
  }
  if (typeof module === "object" && module.exports) module.exports = { choose };
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  let width = innerWidth, height = innerHeight;
  root.dataset.layout = choose(width, height);
  function update(orientation = false) {
    const nextWidth = innerWidth, nextHeight = innerHeight;
    const editable = document.activeElement?.matches("input, textarea, select, [contenteditable=true]");
    // Touch browser chrome/keyboards shrink height without changing the device's layout.
    const transientHeight = !orientation && nextWidth === width && (matchMedia("(pointer: coarse)").matches || editable);
    window.dispatchEvent(new Event("econ:geometry-before"));
    if (!transientHeight) {
      width = nextWidth; height = nextHeight;
      root.dataset.layout = choose(width, height);
    }
    window.dispatchEvent(new Event("econ:geometry-after"));
  }
  addEventListener("resize", () => update());
  // The following resize also supplies the settled geometry if rotation fires early.
  screen.orientation?.addEventListener("change", () => update(true));
})();
