(() => {
  "use strict";
  const glyph = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  function mount(host, { current, icons }) {
    const abort = new AbortController(), options = { signal: abort.signal };
    host.innerHTML = `<div class="feed-rail" role="group" aria-label="Feed controls">
      <button class="icon-button" data-action="previous" aria-label="Previous point" title="Previous point">${glyph("chevron-up")}</button>
      <button class="icon-button feed-multi" aria-label="Card actions" aria-haspopup="menu" aria-expanded="false" aria-controls="feedActionMenu" title="Card actions">${glyph("ellipsis-vertical")}</button>
      <button class="icon-button" data-action="next" aria-label="Next point" title="Next point">${glyph("chevron-down")}</button>
    </div><div id="feedActionMenu" class="feed-action-menu" role="menu" aria-label="Card actions" hidden></div>`;
    const button = host.querySelector(".feed-multi"), menu = host.querySelector(".feed-action-menu");
    let cardId;
    function close(focus = false) {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      if (focus && button.isConnected) button.focus({ preventScroll: true });
    }
    function openMenu() {
      if (!menu.hidden) { close(true); return; }
      close();
      const card = current();
      if (!card) return;
      cardId = card.id;
      const commands = [["save", "bookmark", "Bookmark card", card.saved], ["revisit", "history", "Revisit manually", card.revisit], ["confusing", "flag", "Flag as confusing", card.confusing], ["detail", "book-open", "Closer look", null]];
      menu.replaceChildren();
      for (const [action, symbol, label, checked] of commands) {
        const item = document.createElement("button");
        item.dataset.action = action; item.dataset.id = card.id;
        item.setAttribute("role", checked === null ? "menuitem" : "menuitemcheckbox");
        if (checked !== null) item.setAttribute("aria-checked", String(checked));
        item.innerHTML = `${glyph(symbol)}<span>${label}</span>${checked ? glyph("check") : ""}`;
        menu.append(item);
      }
      for (const [filter, label, symbol] of [["all", "All points", "layers-2"], ["saved", "Bookmarked points", "bookmark"], ["revisit", "Manual revisit list", "history"]]) {
        const item = document.createElement("button");
        item.dataset.action = "feed-filter"; item.dataset.filter = filter;
        item.setAttribute("role", "menuitemradio"); item.setAttribute("aria-checked", String(card.filter === filter));
        item.innerHTML = `${glyph(symbol)}<span>${label}</span>${card.filter === filter ? glyph("check") : ""}`; menu.append(item);
      }
      const appearance = document.createElement("button");
      appearance.dataset.action = "theme-toggle"; appearance.setAttribute("role", "menuitemcheckbox");
      appearance.setAttribute("aria-checked", String(document.documentElement.dataset.theme === "dark"));
      appearance.innerHTML = `${glyph("moon")}<span>Dark mode</span>`;
      menu.append(appearance);
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
      icons();
      menu.querySelector("button").focus({ preventScroll: true });
    }
    button.addEventListener("click", openMenu, options);
    host.addEventListener("click", event => {
      const item = event.target.closest("button");
      if (item?.dataset.action && !["previous", "next"].includes(item.dataset.action)) close(true);
    }, options);
    host.addEventListener("keydown", event => {
      if (menu.hidden) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const items = [...menu.querySelectorAll("button")], index = items.indexOf(document.activeElement), direction = event.key === "ArrowDown" ? 1 : -1;
      items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + direction + items.length) % items.length].focus();
    }, options);
    document.addEventListener("pointerdown", event => { if (!host.contains(event.target)) close(); }, options);
    document.addEventListener("focusin", event => { if (!host.contains(event.target)) close(); }, options);
    window.addEventListener("blur", () => close(), options);
    document.addEventListener("visibilitychange", () => { if (document.hidden) close(); }, options);
    icons();
    return { close: () => close(), sync(id) { if (cardId && id !== cardId) close(); cardId = id; }, destroy() { abort.abort(); } };
  }
  globalThis.EconFeedControls = Object.freeze({ mount });
})();
