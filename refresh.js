(function (root) {
  "use strict";
  const key = "econ-refresh-v1";
  const empty = () => ({ version: 1, opened: {}, revisit: [], confusing: [], current: null });
  function load(storage, ids) {
    try {
      const raw = JSON.parse(storage.getItem(key));
      if (!raw || raw.version !== 1) return empty();
      const allowed = new Set(ids);
      const list = value => Array.isArray(value) ? [...new Set(value.filter(id => allowed.has(id)))] : [];
      return {
        version: 1,
        opened: Object.fromEntries(Object.entries(raw.opened && typeof raw.opened === "object" ? raw.opened : {}).filter(([id, at]) => allowed.has(id) && typeof at === "string" && Number.isFinite(Date.parse(at)))),
        revisit: list(raw.revisit), confusing: list(raw.confusing),
        current: allowed.has(raw.current) ? raw.current : null,
      };
    } catch { return empty(); }
  }
  function open(state, id, now = new Date()) {
    state.opened[id] = now.toISOString();
    state.current = id;
  }
  function toggle(state, kind, id) {
    if (!["revisit", "confusing"].includes(kind)) throw new Error("Invalid browsing preference");
    state[kind] = state[kind].includes(id) ? state[kind].filter(value => value !== id) : [...state[kind], id];
  }
  root.EconRefresh = { key, empty, load, open, toggle };
  if (typeof module !== "undefined" && module.exports) module.exports = root.EconRefresh;
})(globalThis);
