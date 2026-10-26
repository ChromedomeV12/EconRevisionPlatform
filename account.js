(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EconAccount = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function createClient(fetcher = globalThis.fetch) {
    return async (path, data, method = "POST") => {
      if (!/^\/api\/(?:auth\/|me$|admin\/|v1\/)/.test(path)) throw new Error("Invalid API path");
      const response = await fetcher(path, { method: data === undefined ? "GET" : method, credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json", ...(data === undefined ? {} : { "Content-Type": "application/json" }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(body.error?.message || body.message || `Request failed (${response.status})`), { status: response.status });
      return body;
    };
  }
  const escape = text => String(text ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const field = (name, label, type = "text", max = 128) => `<label class="field">${label}<input name="${name}" type="${type}" maxlength="${max}" ${type === "password" ? 'minlength="12" autocomplete="current-password"' : ""} required></label>`;
  const button = (command, label, id = "") => `<button type="button" class="btn" data-account="${command}" data-id="${escape(id)}">${label}</button>`;
  let generation = 0;
  async function render(container) {
    if (location.hash !== "#account") return;
    const ownGeneration = ++generation;
    const call = createClient();
    const status = text => { const node = container.querySelector("#accountStatus"); if (node) node.textContent = text; };
    container.innerHTML = '<div class="view-heading"><h1>Shared workspace</h1><p>Loading account…</p></div>';
    let user = null, unavailable = false;
    try { user = await call("/api/me"); }
    catch (error) { if (error.status !== 401) unavailable = true; }
    if (ownGeneration !== generation || location.hash !== "#account") return;
    let items = [], people = [], pins = [];
    if (user) {
      try {
        items = await call("/api/v1/submissions");
        pins = (await call("/api/v1/catalog")).graphs;
        if (user.roles.includes("admin")) people = await call("/api/admin/accounts");
      } catch (error) { unavailable = true; }
    }
    if (ownGeneration !== generation || location.hash !== "#account") return;
    const has = role => user?.roles.includes(role);
    const recovery = new URL(location.href).searchParams.get("token");
    const form = (name, title, html, label) => `<form data-account-form="${name}"><h2>${title}</h2>${html}<button class="btn primary" type="submit">${label}</button></form>`;
    const authorFields = `<label class="field">Card title<input name="title" maxlength="80" required></label><label class="field">Unit<select name="unit"><option value="micro">Microeconomics</option><option value="macro">Macroeconomics</option><option value="global">Global economics</option><option value="intro">Introduction</option></select></label>${field("topic", "Topic", "text", 80)}${field("headline", "Knowledge point", "text", 130)}<label class="field">Immediate explanation<textarea name="summary" maxlength="480" required></textarea></label><label class="field">Closer-look notes<textarea name="notes" maxlength="1600" required></textarea></label><label class="field">Graph<select name="graphId"><option value="">No graph</option>${pins.map(p => `<option value="${escape(p.id)}">${escape(p.id)} · revision ${p.revision}</option>`).join("")}</select></label><p>Original synthetic explanations only. Syllabus mapping remains provisional.</p>`;
    container.innerHTML = `<div class="view-heading"><h1>Shared workspace</h1><p>${user ? `Signed in as ${escape(user.name)}` : "Synthetic account trial"}</p></div><p id="accountStatus" role="status" aria-live="polite">${unavailable ? "Account service unavailable. Device-local cards and progress remain available." : "Bookmarks and study progress stay on this device."}</p><p><a href="#studio">Device-local studio</a> · <a href="#feed">Return to refresh</a></p><div class="account-workspace">${!user ? [
      form("signin", "Sign in", field("email", "Email", "email", 254) + field("password", "Password", "password"), "Sign in"),
      form("signup", "Register", field("name", "Display name", "text", 80) + field("email", "Invited synthetic email", "email", 254) + field("password", "Password (at least 12 characters)", "password"), "Register"),
      form("recover", "Recover account", field("email", "Email", "email", 254), "Request reset link"),
      form("verify", "Verify email", field("email", "Email", "email", 254), "Request verification link"),
      recovery ? form("reset", "Choose a new password", field("newPassword", "New password", "password"), "Reset password") : "",
    ].join("") : `<section><h2>Account</h2><p>${escape(user.email)}</p><p>Permissions: ${escape(user.roles.join(", ") || "reader")}</p>${button("logout", "Sign out")}${button("revoke", "Sign out all sessions")}</section>${has("author") ? form("draft", "New shared draft", authorFields, "Save private draft") : ""}${has("admin") ? `<section><h2>Account administration</h2>${form("invite", "Invite synthetic account", field("email", "Email ending .invalid", "email", 254), "Invite")}<h3>Verified account permissions</h3>${people.map(p => `<form data-account-form="roles" data-id="${escape(p.id)}"><p>${escape(p.name)} · ${escape(p.email)}${p.emailVerified ? "" : " · Unverified"}</p>${["author", "reviewer", "publisher", "admin"].map(role => `<label><input type="checkbox" name="role" value="${role}" ${p.roles.includes(role) ? "checked" : ""}> ${role}</label>`).join(" ")}<button type="submit" class="btn">Update permissions</button>${button("admin-revoke", "Revoke sessions", p.id)}</form>`).join("")}</section>` : ""}<section><h2>Shared submissions</h2>${items.length ? items.map(item => `<article class="account-submission"><h3>${escape(item.card.title)}</h3><p>${escape(item.status)} · revision ${item.version}</p><p>${escape(item.card.headline)}</p><p>${escape(item.card.summary)}</p><details><summary>Exact revision and review history</summary><p>${escape(item.card.notes)}</p><p>${escape(item.hash)}</p><p>Graph: ${escape(item.graph ? `${item.graph.id}, revision ${item.graph.revision}, ${item.graph.hash}` : "none")}</p><ul>${item.events.map(e => `<li>${escape(e.action)}: ${escape(e.detail.comment || "")} ${escape(e.at)}</li>`).join("")}</ul></details>${item.owner === user.id && has("author") ? `${["draft", "changes_requested"].includes(item.status) ? button("submit", "Submit for independent review", item.id) : ""}${["draft", "changes_requested", "approved", "published"].includes(item.status) ? button("edit", "Create revised draft", item.id) : ""}` : ""}${item.owner !== user.id && has("reviewer") && item.status === "submitted" ? form(`review-${item.id}`, "Independent editorial review", '<label class="field">Review comment<textarea name="comment" maxlength="1000" required></textarea></label><label class="field">Decision<select name="decision"><option value="changes_requested">Changes requested</option><option value="approved">Approve exact revision</option></select></label>', "Record review") : ""}${item.owner !== user.id && has("publisher") ? `${button(item.reuseAllowed ? "withdraw" : "permission", item.reuseAllowed ? "Withdraw reuse permission" : "Confirm reuse permission for exact card and graph", item.id)}${item.status === "approved" ? button("publish", "Publish approved revision", item.id) : ""}` : ""}</article>`).join("") : "<p>No shared submissions.</p>"}</section>`}</div>`;
    const attempts = new Map();
    const mutate = async (path, data, method) => {
      const key = JSON.stringify({ path, data, method });
      if (!attempts.has(key)) attempts.set(key, crypto.randomUUID());
      const response = await call(path, { requestId: attempts.get(key), ...data }, method);
      attempts.delete(key); return response;
    };
    const handle = async task => {
      const buttons = container.querySelectorAll("button"); buttons.forEach(b => { b.disabled = true; });
      try { const message = await task(); await render(container); status(message || "Saved."); }
      catch (error) { status(error.status === 409 ? `Conflict: ${error.message}. Refresh before retrying.` : error.message); buttons.forEach(b => { b.disabled = false; }); }
    };
    container.onclick = event => {
      const target = event.target.closest("[data-account]"); if (!target) return;
      const command = target.dataset.account, item = items.find(i => i.id === target.dataset.id);
      const path = item ? `/api/v1/submissions/${item.id}` : "";
      const bound = item ? { expectedVersion: item.version, hash: item.hash } : {};
      if (command === "edit") {
        const section = document.createElement("section"); section.innerHTML = form("edit", "Revised private draft", authorFields, "Save new immutable revision");
        const editor = section.querySelector("form"); editor.dataset.id = item.id;
        for (const [key, value] of Object.entries(item.card)) if (editor.elements[key]) editor.elements[key].value = value ?? "";
        container.querySelector(".account-workspace").prepend(section); editor.querySelector("input").focus(); return;
      }
      handle(async () => {
        if (command === "logout") { await call("/api/auth/sign-out", {}); return "Signed out. Local progress is unchanged."; }
        if (command === "revoke") { await call("/api/auth/revoke-sessions", {}); return "All sessions revoked."; }
        if (command === "admin-revoke") return call("/api/admin/revoke-sessions", { userId: target.dataset.id }).then(() => "Sessions revoked.");
        if (command === "submit") return mutate(path + "/submit", { expectedVersion: item.version }).then(() => "Submitted for independent review.");
        if (["permission", "withdraw"].includes(command)) return mutate(path + "/permissions", { ...bound, allowed: command === "permission" }).then(() => "Reuse permission recorded separately from editorial review.");
        if (command === "publish") return mutate("/api/v1/publications", { ...bound, submissionId: item.id }).then(() => "Revision published. Teacher verification remains pending.");
      });
    };
    container.onsubmit = event => {
      const form = event.target.closest("[data-account-form]"); if (!form) return;
      event.preventDefault();
      const kind = form.dataset.accountForm, data = Object.fromEntries(new FormData(form));
      handle(async () => {
        const callbackURL = `${location.origin}${location.pathname}#account`;
        if (kind === "signin") { await call("/api/auth/sign-in/email", data); return "Signed in."; }
        if (kind === "signup") { await call("/api/auth/sign-up/email", { ...data, callbackURL }); return "If eligible, check the local test mailbox for verification."; }
        if (kind === "verify") { await call("/api/auth/send-verification-email", { ...data, callbackURL }); return "If eligible, check the local test mailbox."; }
        if (kind === "recover") { await call("/api/auth/request-password-reset", { ...data, redirectTo: `${location.origin}${location.pathname}?recovery=1#account` }); return "If eligible, check the local test mailbox."; }
        if (kind === "reset") { await call("/api/auth/reset-password", { ...data, token: recovery }); history.replaceState(null, "", location.pathname + "#account"); return "Password reset. Sign in again."; }
        if (kind === "invite") { await call("/api/admin/invites", data); return "Synthetic invitation recorded."; }
        if (kind === "roles") { await call(`/api/admin/accounts/${form.dataset.id}/roles`, { roles: new FormData(form).getAll("role") }); return "Permissions updated; target sessions revoked."; }
        const item = items.find(i => i.id === form.dataset.id || kind === `review-${i.id}`);
        if (kind.startsWith("review-")) return mutate(`/api/v1/submissions/${item.id}/reviews`, { ...data, expectedVersion: item.version, hash: item.hash }).then(() => "Independent review recorded.");
        if (kind === "draft" || kind === "edit") {
          form.dataset.cardId ||= `authored-${crypto.randomUUID()}`;
          const card = { ...(item?.card || {}), ...data, id: item?.card.id || form.dataset.cardId, revision: item ? item.version + 1 : 1, graphId: data.graphId || null, level: item?.card.level || "unmapped", sources: item?.card.sources || [{ id: "original", page: null }], related: item?.card.related || [], takeaway: item?.card.takeaway || "", caution: item?.card.caution || "" };
          return mutate(item ? `/api/v1/submissions/${item.id}` : "/api/v1/submissions", { card, ...(item ? { expectedVersion: item.version } : {}) }, item ? "PATCH" : "POST").then(() => "Private draft saved. Nothing was published.");
        }
      });
    };
  }
  return Object.freeze({ createClient, render });
});
