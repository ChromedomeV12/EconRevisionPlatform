(() => {
  "use strict";
  const views = [["feed", "Refresh", "layers-2"], ["units", "Library", "library"], ["progress", "Dashboard", "layout-dashboard"], ["saved", "Saved", "bookmark"], ["studio", "Studio", "square-pen"]];
  const glyph = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  function mount(host, { current, navigate, icons }) {
    const abort = new AbortController(), options = { signal: abort.signal };
    host.innerHTML = `<div class="feed-rail" role="group" aria-label="Feed controls">
      <button class="icon-button" data-action="previous" aria-label="Previous point" title="Previous point">${glyph("chevron-up")}</button>
      <button class="icon-button feed-multi" aria-label="Card actions" aria-haspopup="menu" aria-expanded="false" aria-controls="feedActionMenu" title="Card actions; hold for views">${glyph("grip")}</button>
      <button class="icon-button" data-action="next" aria-label="Next point" title="Next point">${glyph("chevron-down")}</button>
    </div><div id="feedActionMenu" class="feed-action-menu" role="menu" aria-label="Card actions" hidden></div>
    <div class="feed-dial" role="menu" aria-label="Switch view" hidden><div class="feed-dial-ring" aria-hidden="true"></div>${views.map(([id, label, symbol], i) => `<button role="menuitem" data-view="${id}" data-slot="${i}" tabindex="-1"><span>${label}</span>${glyph(symbol)}</button>`).join("")}</div>
    <span class="sr-only feed-dial-status" aria-live="polite"></span>`;
    const button = host.querySelector(".feed-multi"), menu = host.querySelector(".feed-action-menu"), dial = host.querySelector(".feed-dial"), status = host.querySelector(".feed-dial-status");
    let timer, pointer = null, startY = 0, startX = 0, holding = false, dragged = false, cancelledPress = false, selected = 0, suppressUntil = 0, cardId;
    let touchPress = false, lastHapticAt = -Infinity, vibrationStarted = false;
    function tick() {
      if (!touchPress || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches || typeof navigator.vibrate !== "function") return;
      const now = performance.now();
      if (now - lastHapticAt < 50) return;
      lastHapticAt = now;
      try { vibrationStarted = navigator.vibrate(8) || vibrationStarted; } catch { /* Haptics are optional. */ }
    }
    function stopHaptics() {
      if (vibrationStarted) { try { navigator.vibrate(0); } catch { /* Browser/device may decline. */ } }
      vibrationStarted = false;
    }
    const cancelTimer = () => { clearTimeout(timer); timer = null; };
    function close(focus = false) {
      cancelTimer(); menu.hidden = dial.hidden = true; holding = false;
      stopHaptics();
      button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-controls", "feedActionMenu");
      host.classList.remove("is-open", "is-dial");
      if (focus && button.isConnected) button.focus({ preventScroll: true });
    }
    function dismiss(focus = false) {
      const captured = pointer;
      if (captured !== null) suppressUntil = performance.now() + 600;
      pointer = null; close(focus);
      if (captured !== null && button.hasPointerCapture(captured)) button.releasePointerCapture(captured);
    }
    function rotate(index, focus = false) {
      const previous = selected;
      selected = (index + views.length * 100) % views.length;
      if (holding && selected !== previous) tick();
      dial.querySelectorAll("[data-slot]").forEach((item, i) => {
        let distance = (i - selected + views.length) % views.length;
        if (distance > 2) distance -= views.length;
        const angle = distance * Math.PI / 5;
        item.style.left = `${279 - 88 * Math.cos(angle)}px`;
        item.style.top = `${160 + 88 * Math.sin(angle)}px`;
        item.classList.toggle("is-selected", i === selected);
        item.tabIndex = i === selected ? 0 : -1;
      });
      status.textContent = views[selected][1];
      if (focus) dial.querySelector(`[data-slot="${selected}"]`).focus({ preventScroll: true });
    }
    function openDial(focus = false) {
      close(); dial.hidden = false; host.classList.add("is-open", "is-dial");
      button.setAttribute("aria-controls", "feedViewDial"); dial.id = "feedViewDial";
      button.setAttribute("aria-expanded", "true"); rotate(0, focus);
    }
    function openMenu() {
      if (!menu.hidden) { close(true); return; }
      close(); const card = current(); if (!card) return;
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
        const item = document.createElement("button"); item.dataset.action = "feed-filter"; item.dataset.filter = filter;
        item.setAttribute("role", "menuitemradio"); item.setAttribute("aria-checked", String(card.filter === filter));
        item.innerHTML = `${glyph(symbol)}<span>${label}</span>${card.filter === filter ? glyph("check") : ""}`; menu.append(item);
      }
      const appearance = document.createElement("button"); appearance.dataset.action = "theme-toggle"; appearance.setAttribute("role", "menuitemcheckbox"); appearance.setAttribute("aria-checked", String(document.documentElement.dataset.theme === "dark"));
      appearance.innerHTML = `${glyph("moon")}<span>Dark mode</span>`; menu.append(appearance);
      const switcher = document.createElement("button"); switcher.dataset.switchViews = "true"; switcher.setAttribute("role", "menuitem");
      switcher.innerHTML = `${glyph("compass")}<span>Switch view</span>${glyph("chevron-right")}`; menu.append(switcher);
      menu.hidden = false; host.classList.add("is-open"); button.setAttribute("aria-expanded", "true"); icons();
      menu.querySelector("button").focus({ preventScroll: true });
    }
    const choose = () => { const view = views[selected][0]; close(true); if (view !== "feed") navigate(view); };
    button.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      cancelTimer(); pointer = event.pointerId; startY = event.clientY; startX = event.clientX; dragged = false; cancelledPress = false;
      touchPress = event.pointerType === "touch";
      button.setPointerCapture(pointer);
      timer = setTimeout(() => { openDial(); holding = true; suppressUntil = performance.now() + 1000; }, 360);
    }, options);
    button.addEventListener("pointermove", event => {
      if (pointer !== event.pointerId) return;
      if (!holding) {
        if (Math.hypot(event.clientY - startY, event.clientX - startX) > 12) { cancelTimer(); cancelledPress = true; }
        return;
      }
      const delta = event.clientY - startY;
      if (Math.abs(delta) >= 24) dragged = true;
      rotate(Math.round(-delta / 46)); event.preventDefault();
    }, options);
    button.addEventListener("pointerup", event => {
      if (pointer !== event.pointerId) return;
      cancelTimer(); const wasHolding = holding; pointer = null;
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      if (cancelledPress) suppressUntil = performance.now() + 600;
      if (wasHolding) { suppressUntil = performance.now() + 600; holding = false; if (dragged) choose(); }
    }, options);
    const cancel = event => { if (pointer === event.pointerId) { pointer = null; suppressUntil = performance.now() + 600; close(); } };
    button.addEventListener("pointercancel", cancel, options);
    button.addEventListener("lostpointercapture", cancel, options);
    button.addEventListener("contextmenu", event => { event.preventDefault(); if (!holding) openDial(true); }, options);
    button.addEventListener("click", event => {
      if (event.detail && performance.now() < suppressUntil) { event.preventDefault(); return; }
      openMenu();
    }, options);
    host.addEventListener("click", event => {
      const item = event.target.closest("button");
      if (item?.hasAttribute("data-switch-views")) openDial(true);
      else if (item?.dataset.view) { selected = Number(item.dataset.slot); choose(); }
      else if (item?.dataset.action && !["previous", "next"].includes(item.dataset.action)) close(true);
    }, options);
    host.addEventListener("keydown", event => {
      if (event.target === button && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) { event.preventDefault(); openDial(true); return; }
      if (menu.hidden && dial.hidden) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(true); return; }
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!dial.hidden) rotate(event.key === "Home" ? 0 : event.key === "End" ? views.length - 1 : selected + direction, true);
      else {
        const items = [...menu.querySelectorAll("button")], index = items.indexOf(document.activeElement);
        items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + direction + items.length) % items.length].focus();
      }
    }, options);
    document.addEventListener("pointerdown", event => { if (!host.contains(event.target)) dismiss(); }, options);
    document.addEventListener("focusin", event => { if (!host.contains(event.target)) dismiss(); }, options);
    window.addEventListener("blur", () => dismiss(), options);
    document.addEventListener("visibilitychange", () => { if (document.hidden) dismiss(); }, options);
    icons();
    return { close: dismiss, sync(id) { if (cardId && id !== cardId) dismiss(); cardId = id; }, destroy() { cancelTimer(); stopHaptics(); abort.abort(); pointer = null; } };
  }
  globalThis.EconFeedControls = Object.freeze({ mount });
})();
