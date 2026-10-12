(() => {
  "use strict";
  const menuKey = "econ-menu-hidden-v1";
  let menuHidden = false;
  try { menuHidden = localStorage.getItem(menuKey) === "true"; } catch { /* Optional preference. */ }
  document.documentElement.dataset.menuHidden = String(menuHidden);

  function applyMenu() {
    document.documentElement.dataset.menuHidden = String(menuHidden);
    const menu = document.getElementById("workspaceMenu");
    const toggle = document.querySelector('[data-action="menu-toggle"]');
    if (!menu || !toggle) return;
    menu.hidden = menuHidden;
    toggle.setAttribute("aria-expanded", String(!menuHidden));
    toggle.setAttribute("aria-label", menuHidden ? "Show menu" : "Hide menu");
    toggle.title = menuHidden ? "Show menu" : "Hide menu";
  }
  document.addEventListener("DOMContentLoaded", applyMenu);
  document.addEventListener("click", event => {
    if (!event.target.closest('[data-action="menu-toggle"]')) return;
    menuHidden = !menuHidden;
    applyMenu();
    try { localStorage.setItem(menuKey, String(menuHidden)); } catch { /* Works without storage. */ }
    window.dispatchEvent(new Event("resize"));
  });

  const key = "econ-theme-v1";
  const system = matchMedia("(prefers-color-scheme: dark)");
  let preference;
  try {
    const stored = localStorage.getItem(key);
    if (stored === "dark" || stored === "light") preference = stored;
  } catch { /* Theme switching also works when storage is unavailable. */ }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue("--ctp-base").trim();
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
