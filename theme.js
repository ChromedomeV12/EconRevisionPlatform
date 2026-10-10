(() => {
  "use strict";
  const key = "econ-theme-v1";
  const system = matchMedia("(prefers-color-scheme: dark)");
  let preference;
  try {
    const stored = localStorage.getItem(key);
    if (stored === "dark" || stored === "light") preference = stored;
  } catch { /* Theme switching also works when storage is unavailable. */ }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#1e1e2e" : "#e7ecef";
    const toggle = document.querySelector('[data-action="theme-toggle"]');
    if (!toggle) return;
    const dark = theme === "dark";
    toggle.setAttribute("aria-checked", String(dark));
    toggle.title = dark ? "Switch to light mode" : "Switch to dark mode";
    toggle.innerHTML = `<i data-lucide="${dark ? "sun" : "moon"}" aria-hidden="true"></i>`;
    if (window.lucide) lucide.createIcons({ root: toggle });
  }

  // Apply before styles load so a saved dark theme does not flash light.
  apply(preference || (system.matches ? "dark" : "light"));
  document.addEventListener("DOMContentLoaded", () => apply(document.documentElement.dataset.theme));
  document.addEventListener("click", event => {
    if (!event.target.closest('[data-action="theme-toggle"]')) return;
    preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    apply(preference);
    try { localStorage.setItem(key, preference); } catch { /* Keep the choice for this visit. */ }
  });
  system.addEventListener("change", () => {
    if (!preference) apply(system.matches ? "dark" : "light");
  });
  window.addEventListener("storage", event => {
    if (event.key !== key && event.key !== null) return;
    preference = event.newValue === "dark" || event.newValue === "light" ? event.newValue : undefined;
    apply(preference || (system.matches ? "dark" : "light"));
  });
})();
