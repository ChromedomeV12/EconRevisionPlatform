(() => {
  "use strict";
  const menuKey = "econ-menu-hidden-v1";
  let menuHidden = false;
  try { menuHidden = localStorage.getItem(menuKey) === "true"; } catch { /* Optional preference. */ }
  const narrow = matchMedia("(max-width: 1023px)");
  function applyMenu() {
    const menu = document.getElementById("workspaceMenu"), drawer = document.getElementById("mobileMenu");
    const toggle = document.querySelector('[data-action="menu-toggle"]');
    if (!menu || !drawer || !toggle) return;
    if (narrow.matches) {
      if (menu.parentElement !== drawer) drawer.append(menu);
      menu.hidden = false;
      document.documentElement.dataset.menuHidden = "false";
      toggle.setAttribute("aria-controls", "mobileMenu");
      toggle.setAttribute("aria-expanded", String(drawer.open));
      toggle.setAttribute("aria-label", drawer.open ? "Close menu" : "Show menu");
    } else {
      if (drawer.open) drawer.close();
      document.querySelector(".workspace-layout").prepend(menu);
      menu.hidden = menuHidden;
      document.documentElement.dataset.menuHidden = String(menuHidden);
      toggle.setAttribute("aria-controls", "workspaceMenu");
      toggle.setAttribute("aria-expanded", String(!menuHidden));
      toggle.setAttribute("aria-label", menuHidden ? "Show menu" : "Hide menu");
    }
    toggle.title = toggle.getAttribute("aria-label");
  }
  document.addEventListener("DOMContentLoaded", () => {
    applyMenu();
    const drawer = document.getElementById("mobileMenu");
    drawer.addEventListener("close", applyMenu);
    drawer.addEventListener("click", event => {
      const r = drawer.getBoundingClientRect();
      if (event.target === drawer && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) drawer.close();
    });
  });
  narrow.addEventListener("change", applyMenu);
  document.addEventListener("click", event => {
    const drawer = document.getElementById("mobileMenu");
    if (event.target.closest('[data-action="menu-close"]') || (event.target.closest('#workspaceMenu a, #workspaceMenu [data-action="settings"]') && drawer.open)) drawer.close();
    if (!event.target.closest('[data-action="menu-toggle"]')) return;
    if (narrow.matches) {
      if (drawer.open) drawer.close(); else drawer.showModal();
      applyMenu();
    } else {
      menuHidden = !menuHidden;
      applyMenu();
      try { localStorage.setItem(menuKey, String(menuHidden)); } catch { /* Optional preference. */ }
    }
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
