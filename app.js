(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const L = EconLearning;
  const decisions = EconDecisions.createService();
  const units = EconData.units;
  let state;
  try {
    state = L.load(localStorage);
  } catch {
    state = L.empty();
  }
  let route = "feed",
    filter = "all",
    search = "",
    studioTab = "create",
    editing = null;
  let session = null, feedFilter = "all", feedObserver, feedControls;
  let refreshState;
  try { refreshState = EconRefresh.load(localStorage, [...EconData.cards, ...state.submissions.filter(s => s.status === "approved")].map(c => c.id)); }
  catch { refreshState = EconRefresh.empty(); }
  let toastTimer, modalOpener;
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const unitOf = (card) => units.find((u) => u.id === card.unit) || units[0];
  const subjectOf = card => card.visual === "development" ? "development" : ({ micro: "micro", macro: "macro", global: "global" }[card.unit] || "intro");
  const cards = () => [
    ...EconData.cards,
    ...state.submissions
      .filter((s) => s.status === "approved")
      .map((s) => ({
        ...s,
        topic: s.title,
        tag: "Personal card",
        visual: "custom",
        takeaway: "",
        trap: "Personal content. Check your source if you are unsure.",
        rubric: [],
        related: [],
        version: s.version || 1,
      })),
  ];
  const findCard = (id) => cards().find((c) => c.id === id);
  const icons = () => lucide.createIcons();
  function save() {
    try {
      localStorage.setItem("econ-workspace-v2", JSON.stringify(state));
      return true;
    } catch {
      toast("Storage unavailable. Changes last only for this visit.");
      return false;
    }
  }
  function toast(message) {
    $("#toast").textContent = message;
    $("#toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => $("#toast").classList.remove("visible"),
      3500,
    );
  }
  function saveRefresh() {
    try { localStorage.setItem(EconRefresh.key, JSON.stringify(refreshState)); }
    catch { toast("Storage unavailable. Browsing changes last for this visit only."); }
  }
  const refreshCopy = card => card.refresh || { headline: card.title, summary: card.answer.length > 190 ? card.answer.slice(0, 187) + "..." : card.answer };
  function status(card) {
    return refreshState.confusing.includes(card.id) ? "Flagged" : refreshState.revisit.includes(card.id) ? "Revisit" : refreshState.opened[card.id] ? "Opened" : "Unopened";
  }
  function heading(title, subtitle, action = "") {
    return `<div class="view-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
  }
  function button(
    text,
    action,
    name = "arrow-right",
    extra = "",
    style = "primary",
  ) {
    return `<button class="btn ${style}" data-action="${action}" ${extra}>${text}${icon(name)}</button>`;
  }
  function empty(title, text, action = "", symbol = "inbox") {
    return `<div class="empty-state">${icon(symbol)}<h2>${title}</h2><p>${text}</p>${action}</div>`;
  }
  function navigate(view) {
    if (location.hash === `#${view}`) render();
    else location.hash = view;
  }
  function openModal(content) {
    if (!$("#modal").open) modalOpener = document.activeElement;
    feedControls?.close();
    $("#modalContent").innerHTML = content;
    icons();
    const modal = $("#modal"), contentNode = $("#modalContent");
    modal.querySelector(":scope > .modal-header")?.remove();
    const close = contentNode.querySelector('[data-action="close"]');
    const heading = contentNode.querySelector(".detail-heading");
    if (heading) {
      heading.classList.add("modal-header");
      modal.prepend(heading);
    }
    close?.classList.add("modal-close");
    const title = modal.querySelector("h2");
    if (title) { title.id = "modalTitle"; modal.setAttribute("aria-labelledby", title.id); }
    if (!modal.open) modal.showModal();
    contentNode.scrollTop = 0;
    close?.focus({ preventScroll: true });
  }
  const closeButton = () =>
    `<button class="icon-button" data-action="close" aria-label="Close dialog" title="Close">${icon("x")}</button>`;
  function render() {
    const alias = {
      top: "feed",
      chapters: "units",
      deepDive: "units",
      mindmap: "units",
      knowledge: "feed",
      videos: "units",
    };
    const hash = location.hash.slice(1).split("/")[0];
    route =
      alias[hash] ||
      (["welcome", "progress", "feed", "units", "saved", "studio"].includes(hash)
        ? hash
        : "feed");
    feedObserver?.disconnect();
    feedControls?.destroy();
    feedSizeObserver.disconnect();
    cancelAnimationFrame(geometryFrame);
    document.body.classList.toggle("welcome-mode", route === "welcome");
    document.body.classList.toggle("feed-mode", route === "feed");
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === route);
      if (a.dataset.nav === route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const labels = {
      welcome: "Welcome",
      progress: "Dashboard",
      feed: "Refresh",
      units: "Topic library",
      saved: "Saved cards",
      studio: "Card studio",
    };
    $("#viewLabel").textContent = labels[route];
    document.title = `${labels[route]} / Econ`;
    $("#navDue").textContent = refreshState.revisit.length;
    $("#navDue").title = "Points set aside to revisit";
    if (route === "welcome") renderWelcome();
    if (route === "progress") renderDashboard();
    if (route === "units" || route === "saved") renderLibrary();
    if (route === "feed") {
      if (!session) newSession();
      else {
        const current = activeCard()?.id;
        session.ids = cards().map(c => c.id);
        session.index = Math.max(0, session.ids.indexOf(current));
      }
      renderFeed();
    }
    if (route === "studio") renderStudio();
    icons();
  }
  function studyIllustration() {
    return `<div class="study-illustration" aria-hidden="true"><div class="illustration-window"><div class="window-dots"><span></span><span></span><span></span></div><svg viewBox="0 0 180 100" fill="none"><path d="M18 10V84H168" class="illustration-axis"/><path d="M30 20L153 75" class="illustration-demand"/><path d="M30 76L153 18" class="illustration-supply"/><circle cx="91" cy="48" r="6" class="illustration-point"/></svg></div><span class="illustration-note">${icon("lightbulb")} A new perspective</span></div>`;
  }
  function heroDiagrams() {
    return `<div class="hero-diagrams">
      <figure class="hero-diagram externality-diagram"><figcaption><span>MICROECONOMICS</span>Negative externality</figcaption><svg viewBox="0 0 240 210" role="img" aria-label="Negative production externality: MSC lies above MPC, so socially efficient output Qs is below market output Qm.">
        <path class="hero-axis" d="M40 30V170H211"/><text class="hero-axis-label" x="12" y="22">Cost / benefit</text><text class="hero-axis-label" x="205" y="195">Q</text>
        <path class="hero-guide" d="M108 93V170M137 114V170"/><path class="hero-welfare" d="M108 93L137 114V79Z"/>
        <path class="hero-blue-line" d="M55 55L195 155"/><path class="hero-private-line" d="M55 155L195 85"/><path class="hero-purple-line" d="M55 120L195 50"/>
        <text class="hero-blue-label" x="201" y="159">D</text><text class="hero-private-label" x="191" y="80">MPC</text><text class="hero-purple-label" x="191" y="44">MSC</text><text class="hero-axis-label" x="100" y="189">Qs</text><text class="hero-axis-label" x="130" y="189">Qm</text>
      </svg></figure>
      <figure class="hero-diagram aggregate-diagram"><figcaption><span>MACROECONOMICS</span>Aggregate demand & supply</figcaption><svg viewBox="0 0 240 210" role="img" aria-label="Aggregate demand slopes downward and short-run aggregate supply slopes upward, intersecting at equilibrium price level Pe and real output Ye.">
        <path class="hero-axis" d="M40 30V170H211"/><text class="hero-axis-label" x="12" y="22">Price level</text><text class="hero-axis-label" x="170" y="205">Real GDP</text>
        <path class="hero-guide" d="M40 101H122V170"/><path class="hero-blue-line" d="M55 55L195 150"/><path class="hero-purple-line" d="M55 150L195 48"/><circle class="hero-equilibrium" cx="122" cy="101" r="4"/>
        <text class="hero-blue-label" x="198" y="156">AD</text><text class="hero-purple-label" x="184" y="40">SRAS</text><text class="hero-axis-label" x="16" y="105">Pe</text><text class="hero-axis-label" x="115" y="189">Ye</text>
      </svg></figure>
      <figure class="hero-diagram ppc-diagram"><figcaption><span>CHOICE & SCARCITY</span>Production possibilities</figcaption><svg viewBox="0 0 240 210" role="img" aria-label="A bowed-out production possibilities curve shows the trade-off between two goods. An outward shift represents increased productive capacity.">
        <path class="hero-axis" d="M40 30V170H211"/><text class="hero-axis-label" x="12" y="22">Good Y</text><text class="hero-axis-label" x="177" y="195">Good X</text>
        <path class="hero-blue-line" d="M40 65C115 65 162 105 172 170"/><path class="hero-purple-line" d="M40 40C136 40 192 94 202 170"/>
        <text class="hero-blue-label" x="83" y="108">PPC₁</text><text class="hero-purple-label" x="153" y="61">PPC₂</text>
      </svg></figure>
      <figure class="hero-diagram demand-shift-diagram"><figcaption><span>MARKETS & CHOICES</span>A shift in demand</figcaption><svg viewBox="0 0 240 210" role="img" aria-label="Demand shifts right from D1 to D2 with supply unchanged, increasing equilibrium price and quantity.">
        <path class="hero-axis" d="M40 30V170H211"/><text class="hero-axis-label" x="12" y="22">Price</text><text class="hero-axis-label" x="201" y="195">Q</text>
        <path class="hero-blue-line" d="M50 60L165 155"/><path class="hero-private-line" d="M83 40L198 135"/><path class="hero-purple-line" d="M55 153L194 45"/>
        <text class="hero-blue-label" x="157" y="168">D₁</text><text class="hero-blue-label" x="198" y="144">D₂</text><text class="hero-purple-label" x="200" y="43">S</text>
      </svg></figure>
    </div>`;
  }
  function renderWelcome() {
    $("#main").innerHTML = `<section class="welcome-hero"><span class="eyebrow">YOUR ECONOMICS STUDY SPACE</span><h1>Understand the ideas.<br>See the bigger picture.</h1><p>Make sense of markets, choices and the world around you.<br> One clear explanation at a time.</p><a class="btn primary hero-cta" href="#feed">Start learning ${icon("arrow-right")}</a><a class="hero-secondary" href="#progress">Go to your dashboard</a>${heroDiagrams()}</section><section class="welcome-features" aria-label="Ways to learn"><a class="welcome-card" href="#feed"><div class="welcome-card-heading"><h2>Refresh your thinking</h2>${icon("arrow-up-right")}</div><p>Explore one economic idea, with a clear explanation and a useful visual.</p><div class="feature-preview" aria-hidden="true"><span>YOUR DAILY PERSPECTIVE</span><strong>Why do markets fail?</strong>${studyIllustration()}</div></a><a class="welcome-card" href="#units"><div class="welcome-card-heading"><h2>Connect the concepts</h2>${icon("arrow-up-right")}</div><p>Find your way through microeconomics, macroeconomics and the global economy.</p><div class="feature-preview preview-topics" aria-hidden="true">${units.slice(1).map(u=>`<div>${icon(u.icon)}<span>${u.name}</span>${icon("arrow-right")}</div>`).join("")}</div></a><a class="welcome-card" href="#saved"><div class="welcome-card-heading"><h2>Keep what matters</h2>${icon("arrow-up-right")}</div><p>Save a useful idea. Set a point aside. Return when you want another look.</p><div class="feature-preview preview-saved" aria-hidden="true">${icon("bookmark")}<strong>Your next lightbulb moment.</strong><span>A personal collection of ideas.</span></div></a><span class="feature-arc" aria-hidden="true"></span></section><div class="welcome-footnote">Built for independent IB Economics revision. Sample content, not teacher verified.</div><button class="help-button" data-action="help" aria-label="Open help">${icon("circle-help")}</button>`;
  }
  function renderDashboard() {
    const all = cards();
    const opened = all.filter(c => refreshState.opened[c.id]);
    const today = opened.filter(c => L.dayKey(refreshState.opened[c.id]) === L.dayKey()).length;
    const last = opened.length ? [...opened].sort((a,b)=>new Date(refreshState.opened[b.id])-new Date(refreshState.opened[a.id]))[0] : null;
    const stat = (label, value, symbol) => `<div class="stat"><div class="stat-top"><span class="stat-symbol">${icon(symbol)}</span>${label}</div><strong class="stat-value">${value}</strong></div>`;
    const continuation = last
      ? `<span class="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>${escape(last.topic)}</h2><p>${escape(unitOf(last).name)} · ${escape(refreshCopy(last).summary)}</p><button class="btn primary" data-action="study" data-id="${escape(last.id)}">Continue refreshing ${icon("arrow-right")}</button>`
      : `<span class="eyebrow">GET STARTED</span><h2>Open your first point</h2><p>Take the feed's order for a first look at the collection, or choose a topic from the library below.</p><button class="btn primary" data-action="start">Start refreshing ${icon("arrow-right")}</button>`;
    $("#main").innerHTML = `${heading("Dashboard", "What you have opened, saved and set aside.")}
      <section class="activity-section"><div class="section-heading"><h2>Browsing activity</h2><span class="subtle">Browsing activity, not recall</span></div><div class="stats-grid" aria-label="Browsing statistics">${stat("Points opened", opened.length + "<small> / " + all.length + "</small>", "eye")}${stat("Opened today", today, "calendar-days")}${stat("Saved points", state.saved.length, "bookmark")}${stat("Set aside to revisit", refreshState.revisit.length, "history")}</div></section>
      <section class="dashboard-feature"><div class="feature-banner"><div class="banner-entry">${continuation}</div>${studyIllustration()}</div></section>
      <section class="learning-topics"><div class="section-heading"><h2>Start learning</h2><a class="text-button" href="#units">View all topics ${icon("arrow-right")}</a></div><div class="learning-context"><p>Explore <a href="#units">IB Economics</a>, one concept at a time.</p><span>Choose a topic to begin</span></div><div class="topic-grid">${units.map(u => {
        const list=all.filter(c=>c.unit===u.id), seen=list.filter(c=>refreshState.opened[c.id]).length;
        return `<a href="#units" class="topic-card" data-unit-link="${u.id}"><div class="course-strip">${icon(u.icon)} UNIT ${u.number} · ECONOMICS</div><div class="topic-info"><h3>${u.name}</h3><p>${u.description}</p><div class="course-detail">${icon("layers-2")} ${list.length} knowledge points</div><div class="topic-meta"><span>${seen} opened</span><span>Explore ${icon("arrow-right")}</span></div></div></a>`;
      }).join("")}</div></section>
      <div class="overview-bottom"><section class="refresh-overview-list"><div class="section-heading"><h2>Recently opened</h2><span class="subtle">Your browsing</span></div>${opened.length ? [...opened].sort((a,b)=>new Date(refreshState.opened[b.id])-new Date(refreshState.opened[a.id])).slice(0,4).map(c=>`<button class="refresh-topic-row" data-action="study" data-id="${escape(c.id)}"><span class="unit-icon ${unitOf(c).color}">${icon(unitOf(c).icon)}</span><span><strong>${escape(c.topic)}</strong><small>${escape(unitOf(c).name)}</small></span>${icon("arrow-up-right")}</button>`).join("") : '<p class="subtle">Your opened points will appear here.</p>'}</section>
      <section class="refresh-overview-list"><div class="section-heading"><h2>Set aside</h2><span class="subtle">Chosen by you</span></div>${refreshState.revisit.length ? refreshState.revisit.map(id=>findCard(id)).filter(Boolean).map(c=>`<button class="refresh-topic-row" data-action="study" data-id="${escape(c.id)}"><span class="unit-icon ${unitOf(c).color}">${icon("history")}</span><span><strong>${escape(c.topic)}</strong><small>${escape(unitOf(c).name)}</small></span>${icon("arrow-up-right")}</button>`).join("") : '<p class="subtle">No points set aside to revisit yet.</p>'}</section></div>`;
  }
  function libraryCard(card) {
    const unit = unitOf(card),
      saved = state.saved.includes(card.id);
    return `<article class="library-card"><div class="library-art"><img src="${unit.image}" alt="${unit.name} topic photograph" loading="lazy"/>${card.tag ? `<span class="image-tag">${escape(card.tag)}</span>` : ""}</div><div class="library-body"><div><span class="badge ${unit.color}">${escape(unit.name)}</span> <span class="badge">${escape(status(card))}</span></div><h3>${escape(card.topic)}</h3><p>${escape(refreshCopy(card).summary)}</p><div class="library-bottom"><button class="text-button" data-action="study" data-id="${escape(card.id)}">Open point ${icon("arrow-right")}</button><div><button class="icon-button" data-action="detail" data-id="${escape(card.id)}" title="Open notes" aria-label="Notes for ${escape(card.topic)}">${icon("book-open")}</button> <button class="icon-button ${saved ? "selected" : ""}" data-action="save" data-id="${escape(card.id)}" aria-pressed="${saved}" title="${saved ? "Remove bookmark" : "Save card"}" aria-label="${saved ? "Unsave" : "Save"} ${escape(card.topic)}">${icon("bookmark")}</button></div></div></div></article>`;
  }
  function renderLibrary() {
    const savedView = route === "saved";
    $("#main").innerHTML =
      `${heading(savedView ? "Saved for later" : "Topic library", savedView ? "The ideas you want to come back to." : "A small collection. Plenty to think about.", button("Create a card", "create", "plus", "", ""))}<div class="library-tools"><label class="search-field">${icon("search")}<input type="search" id="topicSearch" aria-label="Search topics" placeholder="Search topics, concepts, questions..." value="${escape(search)}" /></label><span class="library-count" id="resultCount"></span></div><div class="filters" aria-label="Filter by unit">${[{ id: "all", name: "All topics" }, ...units].map((u) => `<button class="filter ${filter === u.id ? "active" : ""}" data-action="filter" data-unit="${u.id}" aria-pressed="${filter === u.id}">${u.name}</button>`).join("")}</div><div id="libraryResults"></div>`;
    renderLibraryResults();
  }
  function renderLibraryResults() {
    const results = cards().filter(
      (c) =>
        (route !== "saved" || state.saved.includes(c.id)) &&
        (filter === "all" || c.unit === filter) &&
        `${c.title} ${c.topic} ${c.question} ${c.tag}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
    $("#resultCount").textContent =
      `${results.length} ${results.length === 1 ? "card" : "cards"}`;
    $("#libraryResults").innerHTML = results.length
      ? `<div class="library-grid">${results.map(libraryCard).join("")}</div>`
      : empty(
          route === "saved" && !state.saved.length
            ? "Keep a thought for later"
            : "No matching cards",
          route === "saved" && !state.saved.length
            ? "Your bookmarked cards will be collected here."
            : "Try another topic or a shorter search.",
          button("Browse all topics", "clear-filters", "library"),
          "bookmark",
        );
    icons();
  }
  function newSession(ids) {
    const selection = ids || cards().map(c => c.id);
    session = { ids: selection, index: Math.max(0, selection.indexOf(refreshState.current)) };
  }
  function activeCard() { return session && findCard(session.ids[session.index]); }
  function feedSelection() {
    return (session?.ids || cards().map(c=>c.id)).map(findCard).filter(Boolean).filter(c => feedFilter === "all" || (feedFilter === "saved" ? state.saved : refreshState.revisit).includes(c.id));
  }
  function feedPosition() {
    const list=feedSelection(), current=list.findIndex(c=>c.id===activeCard()?.id);
    const label=$("#refreshPosition"); if(!label) return;
    label.textContent=`${current+1} / ${list.length}${current===list.length-1 ? " · End of this set" : ""}`;
    feedControls?.sync(activeCard()?.id);
    document.querySelectorAll('[data-action="previous"]').forEach(button => button.disabled=current<=0);
    document.querySelectorAll('[data-action="next"]').forEach(button => button.disabled=current>=list.length-1);
    document.querySelectorAll("[data-feed-jump]").forEach(button => {
      if (button.dataset.id === activeCard()?.id) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    const progress = $(".set-progress");
    if (progress) {
      progress.style.setProperty("--position", `${((current + 1) / list.length) * 100}%`);
      progress.setAttribute("aria-valuenow", String(current + 1));
    }
  }
  function syncCardPreferences(id) {
    for (const [action, selected] of [["save", state.saved.includes(id)], ["revisit", refreshState.revisit.includes(id)], ["confusing", refreshState.confusing.includes(id)]]) {
      document.querySelectorAll(`[data-action="${action}"][data-id="${CSS.escape(id)}"]`).forEach(control => {
        const attribute = control.getAttribute("role") === "menuitemcheckbox" ? "aria-checked" : "aria-pressed";
        control.setAttribute(attribute, String(selected));
      });
    }
  }
  function refreshPoint(card, index, count) {
    const copy = refreshCopy(card), unit = unitOf(card);
    return `<article class="refresh-point" data-point="${escape(card.id)}" aria-label="${index + 1} of ${count}: ${escape(card.topic)}">
      <div class="refresh-body"><div class="refresh-meta"><span class="refresh-unit">${icon(unit.icon)}${escape(unit.name)}</span><span class="desktop-point-position">${String(index + 1).padStart(2,"0")} / ${String(count).padStart(2,"0")}</span></div>
        <h2>${escape(copy.headline)}</h2><p class="refresh-summary">${escape(copy.summary)}</p>
        <div class="refresh-art"><div class="visual-label"><span>${escape(card.topic)}</span>${icon("chart-no-axes-combined")}</div><canvas data-concept="${escape(card.id)}" role="img" aria-label="${escape(visualLabel(card))}"></canvas><small>Original illustrative example</small></div>
        ${card.takeaway ? `<p class="refresh-takeaway">${icon("lightbulb")}<span>${escape(card.takeaway)}</span></p>` : ""}
      </div><footer class="refresh-actions"><button data-action="detail" data-id="${escape(card.id)}">${icon("book-open")}Closer look${icon("arrow-up-right")}</button><div>
        ${[["save","bookmark","Save point",state.saved.includes(card.id)],["revisit","history","Revisit later",refreshState.revisit.includes(card.id)],["confusing","flag","Flag as confusing",refreshState.confusing.includes(card.id)]].map(([a,s,l,on])=>`<button class="icon-button" data-action="${a}" data-id="${escape(card.id)}" aria-label="${l}" title="${l}" aria-pressed="${on}">${icon(s)}</button>`).join("")}
      </div></footer></article>`;
  }
  function renderFeed() {
    feedObserver?.disconnect();
    feedControls?.destroy();
    feedSizeObserver.disconnect();
    cancelAnimationFrame(geometryFrame);
    geometryCard = null;
    const list=feedSelection();
    $("#main").innerHTML=`<section class="refresh-stage"><header class="refresh-heading"><div><span class="eyebrow">YOUR DAILY PERSPECTIVE</span><h1>Economics, refreshed.</h1></div><div class="refresh-filters" role="group" aria-label="Feed selection">${[["all","All"],["saved","Saved"],["revisit","Revisit"]].map(([v,l])=>`<button data-action="feed-filter" data-filter="${v}" aria-pressed="${feedFilter===v}">${l}</button>`).join("")}</div></header>
    ${list.length ? `<div class="refresh-workspace"><div class="refresh-canvas"><div class="refresh-scroll" tabindex="0" aria-label="Knowledge refresh feed">${list.map((card,i)=>refreshPoint(card,i,list.length)).join("")}</div><div class="feed-gesture-controls"></div></div>
      <aside class="refresh-queue" aria-label="Points in this set"><div class="queue-heading"><span>In this set</span><span>${list.length} points</span></div><div class="queue-list">${list.map((card,i)=>`<button data-action="feed-jump" data-feed-jump data-id="${escape(card.id)}" title="Open ${escape(card.topic)}"><span class="queue-number">${String(i+1).padStart(2,"0")}</span><span><strong class="queue-title"><span class="subject-dot" data-subject="${subjectOf(card)}" title="${escape(card.visual === "development" ? "Economic development" : unitOf(card).name)}" aria-label="${escape(card.visual === "development" ? "Economic development" : unitOf(card).name)}"></span>${escape(card.topic)}</strong></span>${icon("arrow-up-right")}</button>`).join("")}</div><a href="#units" class="queue-library">${icon("library")}Explore the library${icon("arrow-right")}</a></aside></div>
      <footer class="refresh-controls"><div class="set-position"><span id="refreshPosition" aria-live="polite"></span><div class="set-progress" role="progressbar" aria-label="Position in this set" aria-valuemin="1" aria-valuemax="${list.length}" aria-valuenow="1"><span></span></div></div><div class="desktop-feed-navigation"><button class="icon-button" data-action="previous" aria-label="Previous point" title="Previous point">${icon("arrow-up")}</button><button class="icon-button" data-action="next" aria-label="Next point" title="Next point">${icon("arrow-down")}</button></div></footer>` : `<div class="refresh-empty">${empty(feedFilter==="saved" ? "No saved points yet" : "Nothing set aside", "", button("Back to all points","feed-filter","arrow-right",'data-filter="all"',"lime"),"bookmark")}</div>`}</section>`;
    icons(); if(!list.length) return;
    list.forEach(card=>renderConcept(card, document.querySelector(`[data-concept="${CSS.escape(card.id)}"]`)));
    const current=list.find(c=>c.id===activeCard()?.id) || list[0];
    session.index=session.ids.indexOf(current.id);
    feedControls = EconFeedControls.mount($(".feed-gesture-controls"), { navigate, icons, current: () => {
      const card = activeCard(); return card && { id: card.id, saved: state.saved.includes(card.id), revisit: refreshState.revisit.includes(card.id), confusing: refreshState.confusing.includes(card.id), filter: feedFilter };
    } });
    feedSizeObserver.disconnect();
    const scroller=$(".refresh-scroll"), node=document.querySelector(`[data-point="${CSS.escape(current.id)}"]`);
    scroller.scrollTo({top:node.offsetTop,behavior:"instant"}); feedPosition();
    // The first visible card of a newly rendered feed is a visit, even if the
    // initial ResizeObserver delivery re-anchors it before intersection arrives.
    let visitPending = true;
    feedObserver=new IntersectionObserver(entries=>{
      for(const entry of entries) if(entry.isIntersecting && entry.intersectionRatio>=.65 && entry.target.isConnected && route==="feed") {
        const id=entry.target.dataset.point;session.index=session.ids.indexOf(id);feedPosition();
        if(!document.hidden && (visitPending || id !== geometryCard || !refreshState.opened[id])){EconRefresh.open(refreshState,id);saveRefresh();}
        visitPending = false;
        geometryCard = null;
      }
    },{root:scroller,threshold:.65});
    scroller.querySelectorAll("[data-point]").forEach(el=>feedObserver.observe(el));
    feedSizeObserver.observe(scroller);
  }
  let geometryFrame, geometryCard;
  function pauseFeedGeometry() {
    if (route !== "feed") return;
    geometryCard = activeCard()?.id;
    feedObserver?.disconnect();
    feedControls?.close();
    cancelAnimationFrame(geometryFrame);
  }
  function settleFeedGeometry() {
    if (route !== "feed") return;
    pauseFeedGeometry();
    geometryFrame = requestAnimationFrame(() => {
      const scroller = $(".refresh-scroll");
      if (!scroller) return;
      const node = scroller.querySelector(`[data-point="${CSS.escape(activeCard()?.id || "")}"]`);
      if (node) scroller.scrollTo({ top: node.offsetTop, behavior: "instant" });
      scroller.querySelectorAll("[data-point]").forEach(el => feedObserver?.observe(el));
      const focused = document.activeElement;
      if (focused && focused !== document.body && !focused.getClientRects().length && !$("#modal").open) scroller.focus({ preventScroll: true });
    });
  }
  window.addEventListener("econ:geometry-before", pauseFeedGeometry);
  window.addEventListener("econ:geometry-after", settleFeedGeometry);
  const feedSizeObserver = new ResizeObserver(settleFeedGeometry);
  function textbookImage(card) {
    const image = card.diagramImage;
    const allowed = new Set(["assets/diagrams/demand-figure-3-2.png", "assets/diagrams/ped-figure-7-1.png"]);
    return image && allowed.has(image.src) && typeof image.alt === "string" && image.alt.trim() &&
      typeof image.fallback === "string" && typeof image.credit === "string" &&
      Number.isInteger(image.width) && image.width > 0 && Number.isInteger(image.height) && image.height > 0 ? image : null;
  }
  function renderConcept(card, canvas) {
    drawConcept(card, canvas);
    const spec = card.graphSpec;
    // Only curated built-in cards may opt in after human review; local submissions cannot.
    if (canvas && EconData.cards.includes(card) && spec?.review?.status === "reviewed" &&
        typeof spec.review.reviewer === "string" && spec.review.reviewer.trim() &&
        typeof EconGraphs !== "undefined" && EconGraphs.validate(spec).valid) {
      const graph = EconGraphs.render(spec, document);
      graph.dataset.graph = card.id;
      canvas.hidden = true;
      canvas.style.display = "none";
      canvas.after(graph);
      const caption = canvas.parentElement.querySelector("small");
      if (caption) caption.textContent = "Reconstructed schematic · Editorial draft";
      const zoom = document.createElement("button");
      zoom.className = "icon-button graph-zoom";
      zoom.type = "button";
      zoom.title = "Enlarge diagram";
      zoom.setAttribute("aria-label", `Enlarge ${card.topic} diagram`);
      zoom.innerHTML = icon("zoom-in");
      zoom.addEventListener("click", () => {
        openModal(`<div class="detail-heading"><h2>${escape(card.topic)}</h2>${closeButton()}</div><div class="native-diagram-detail"></div><p>${escape(card.source)}. Editorial draft; not teacher verified.</p>`);
        $(".native-diagram-detail").append(EconGraphs.render(spec, document));
      });
      canvas.parentElement.append(zoom);
      icons();
      return;
    }
    const source = textbookImage(card);
    if (!source || !canvas) return;
    const image = document.createElement("img");
    image.dataset.diagram = card.id;
    image.alt = source.alt;
    image.width = source.width;
    image.height = source.height;
    image.style.cssText = "display:none;width:100%;object-fit:contain;background:#fff;";
    const zoom = document.createElement("button");
    zoom.className = "icon-button";
    zoom.type = "button";
    zoom.title = "Enlarge diagram";
    zoom.setAttribute("aria-label", `Enlarge ${card.topic} diagram`);
    zoom.innerHTML = icon("zoom-in");
    zoom.style.cssText = "position:absolute;top:-10px;right:6px;width:28px;height:28px;min-height:0;z-index:1;";
    zoom.hidden = true;
    zoom.addEventListener("click", () => {
      openModal(`<div class="detail-heading"><h2>${escape(card.topic)}</h2><button type="button" class="icon-button" data-diagram-size aria-label="Show original size" title="Show original size" aria-pressed="false">${icon("maximize")}</button>${closeButton()}</div><div tabindex="0" role="region" aria-label="Diagram image" style="overflow:auto;background:#fff;max-height:65dvh;"><img src="${escape(source.src)}" alt="${escape(source.alt)}" width="${source.width}" height="${source.height}" style="display:block;width:100%;max-width:${source.width}px;height:auto;" /></div><p>${escape(source.credit)}</p>`);
      const toggle = $("[data-diagram-size]");
      const enlarged = $("#modal img");
      toggle.addEventListener("click", () => {
        const full = toggle.getAttribute("aria-pressed") !== "true";
        toggle.setAttribute("aria-pressed", String(full));
        toggle.setAttribute("aria-label", full ? "Fit diagram to width" : "Show original size");
        toggle.title = full ? "Fit diagram to width" : "Show original size";
        enlarged.style.width = full ? `${source.width}px` : "100%";
        enlarged.style.maxWidth = full ? "none" : `${source.width}px`;
        toggle.innerHTML = icon(full ? "minimize" : "maximize");
        icons();
      });
    });
    const caption = canvas.parentElement.querySelector("small");
    const fallbackCaption = "Textbook diagram unavailable; conceptual fallback";
    if (caption) caption.textContent = fallbackCaption;
    image.onload = () => {
      canvas.hidden = true;
      canvas.style.display = "none";
      image.style.display = "block";
      zoom.hidden = false;
      if (caption) caption.textContent = source.credit;
    };
    image.onerror = () => {
      image.style.display = "none";
      zoom.hidden = true;
      canvas.hidden = false;
      canvas.style.display = "block";
      if (caption) caption.textContent = fallbackCaption;
    };
    canvas.after(image);
    canvas.parentElement.style.position = "relative";
    canvas.parentElement.append(zoom);
    image.src = source.src;
  }
  function visualLabel(card) {
    if (textbookImage(card)) return card.diagramImage.fallback;
    if (card.visual === "elasticity" && card.diagram) {
      const [a, b] = card.diagram.points;
      const quantityChange = (b.quantity - a.quantity) / a.quantity * 100;
      const priceChange = (b.price - a.price) / a.price * 100;
      return `${card.diagram.priceAxis}; ${card.diagram.quantityAxis}. Original illustrative ticket market: A (${a.quantity} tickets per week at $${a.price}) to B (${b.quantity} tickets per week at $${b.price}) on P = 15 - Q/20. Price rises ${priceChange} percent; quantity demanded changes ${quantityChange} percent. ${card.diagram.method}, using A as base: ${quantityChange}% / +${priceChange}% = ${quantityChange / priceChange}; magnitude 2, price elastic. Price axis starts at $${card.diagram.priceRange[0]}. ${card.diagram.assumption}.`;
    }
    if (card.visual === "demand" && card.diagram) {
      const [a, b] = card.diagram.points;
      return `${card.diagram.priceAxis}; ${card.diagram.quantityAxis}. Original illustrative demand curve: price intercept ${card.diagram.priceIntercept}, quantity intercept ${card.diagram.quantityIntercept}. Movement from ${a.label} (${a.quantity} cups per week at $${a.price} per cup) to ${b.label} (${b.quantity} cups per week at $${b.price} per cup) on the same curve. ${card.diagram.assumption}.`;
    }
    return (
      {
        externality:
          "Production externality: social marginal cost above private marginal cost, social optimum below market output.",
        elasticity:
          "Price rises 10 percent while quantity demanded falls 20 percent.",
        demand:
          "A lower price corresponds to a larger quantity on the same downward-sloping demand curve.",
        inflation:
          "Illustrative price index: 100, then 106, then 109.18. Slower inflation still increases prices.",
        gdp: "Nominal GDP rises with prices while real output remains constant.",
        currency:
          "Appreciation increases the foreign currency purchased by one domestic currency unit.",
        development:
          "Income, health and education are different dimensions of development.",
        choice: "Finite time must be allocated between competing alternatives.",
      }[card.visual] || "Personal revision card"
    );
  }
  function drawConcept(card, canvas = $("#conceptCanvas")) {
    if (!canvas) return;
    const styles = getComputedStyle(document.documentElement);
    const palette = name => styles.getPropertyValue(`--ctp-${name}`).trim();
    const axis = palette("overlay1"), demand = palette("blue"), privateCost = palette("green"), socialCost = palette("mauve");
    const scale = Math.max(2, devicePixelRatio || 1);
    canvas.width = 360 * scale;
    canvas.height = 170 * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    if (textbookImage(card)) {
      ctx.fillStyle = palette("text");
      ctx.font = "14px sans-serif";
      const lines = card.visual === "demand"
        ? ["Carrot price: P1 to P2 (rises)", "Quantity demanded: Q1 to Q2 (falls)", "Movement along the same demand curve"]
        : ["Pepsi Cola price: P1 to P2 (falls)", "Quantity demanded: Q1 to Q2 (rises)", "Quantity changes proportionately more"];
      lines.forEach((line, i) => ctx.fillText(line, 18, 48 + i * 32));
      return;
    }
    const unit = unitOf(card),
      ink = {
        green: palette("mauve"),
        blue: palette("teal"),
        pink: palette("blue"),
        yellow: palette("yellow"),
      }[unit.color];
    const line = (points, color = ink, width = 2, dash = []) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const text = (label, x, y, size = 12, color = ink, weight = 500) => {
      ctx.fillStyle = color;
      ctx.font = `${weight} ${[12, 14, 16, 24, 36].reduce((a, b) => Math.abs(b - size) < Math.abs(a - size) ? b : a)}px 'DM Sans', sans-serif`;
      ctx.fillText(label, x, y);
    };
    const dot = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
    };
    if (card.visual === "demand" && card.diagram) {
      const graph = card.diagram;
      const left = 48, right = 314, top = 30, bottom = 126;
      const position = ({ quantity, price }) => [
        left + quantity / graph.quantityIntercept * (right - left),
        bottom - price / graph.priceIntercept * (bottom - top),
      ];
      const arrow = (start, end, color = ink) => {
        line([start, end], color, 2);
        const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
        line([
          [end[0] - 7 * Math.cos(angle - .5), end[1] - 7 * Math.sin(angle - .5)],
          end,
          [end[0] - 7 * Math.cos(angle + .5), end[1] - 7 * Math.sin(angle + .5)],
        ], color, 2);
      };
      text(graph.priceAxis, left, 12, 11, ink, 650);
      text(graph.assumption, 180, 26, 9);
      arrow([left, bottom], [left, top - 5], axis);
      arrow([left, bottom], [right + 12, bottom], axis);
      line([[left, top], [right, bottom]], ink, 2.5);
      text("D", right + 7, bottom - 8, 12, ink, 650);
      text(String(graph.priceIntercept), left - 22, top + 3, 10);
      text("0", left - 12, bottom + 14, 10);
      text(String(graph.quantityIntercept), right - 9, bottom + 14, 10);
      graph.points.forEach(point => {
        const [x, y] = position(point);
        line([[left, y], [x, y], [x, bottom]], axis, 1, [3, 3]);
        dot(x, y);
        text(String(point.price), left - 22, y + 3, 10);
        text(String(point.quantity), x - 7, bottom + 14, 10);
        text(point.label, x + 6, y - 7, 11, ink, 650);
      });
      // All guides, points and the movement arrow use the same linear model.
      const [start, end] = graph.points.map(position);
      const along = fraction => [
        start[0] + fraction * (end[0] - start[0]),
        start[1] + fraction * (end[1] - start[1]),
      ];
      arrow(along(.3), along(.72));
      text(graph.quantityAxis, 108, 163, 11, ink, 650);
    } else if (["externality", "demand"].includes(card.visual)) {
      line(
        [
          [35, 12],
          [35, 142],
          [318, 142],
        ],
        axis,
        1,
      );
      text("P", 15, 22, 12, axis);
      text("Q", 322, 146, 12, axis);
      line(
        [
          [47, 25],
          [285, 122],
        ],
        demand,
        2.5,
      );
      text("D", 293, 126, 12, demand);
      if (card.visual === "externality") {
        line(
          [
            [70, 145],
            [254, 22],
          ],
          socialCost,
          2.5,
        );
        text("MSC", 254, 17, 12, socialCost);
        line(
          [
            [106, 146],
            [286, 30],
          ],
          privateCost,
          2.5,
        );
        text("MPC", 294, 31, 12, privateCost);
        // Intersections of the displayed linear curves, not an empirical dataset.
        const intersect = (x1, y1, x2, y2) => {
          const a = 97 / 238,
            b = 25 - a * 47,
            c = (y2 - y1) / (x2 - x1),
            d = y1 - c * x1;
          const x = (d - b) / (a - c);
          return [x, a * x + b];
        };
        const qS = intersect(70, 145, 254, 22),
          qM = intersect(106, 146, 286, 30);
        ctx.fillStyle = styles.getPropertyValue("--plot-loss").trim();
        ctx.beginPath();
        ctx.moveTo(...qS);
        ctx.lineTo(...qM);
        ctx.lineTo(qM[0], 145 - ((qM[0] - 70) * 123) / 184);
        ctx.closePath();
        ctx.fill();
        [qS, qM].forEach((p) => {
          line([p, [p[0], 142]], axis, 1, [4, 4]);
          dot(...p);
        });
        text("Qs", qS[0] - 8, 158, 12, socialCost);
        text("Qm", qM[0] - 7, 158, 12, privateCost);
      } else {
        [
          [114, 52],
          [226, 98],
        ].forEach((p) => {
          line([[35, p[1]], p, [p[0], 142]], axis, 1, [4, 4]);
          dot(...p);
        });
        text("Lower price", 195, 37, 12);
        text("More quantity", 195, 54, 12);
      }
    } else if (card.visual === "inflation" || card.visual === "gdp") {
      const values =
        card.visual === "inflation" ? [100, 106, 109.18] : [100, 105, 100];
      values.forEach((v, i) => {
        const x = 47 + i * 98,
          height = 55 + (v - 100) * 4;
        ctx.fillStyle = i === 2 ? ink : axis;
        ctx.fillRect(x, 135 - height, 52, height);
        text(String(v), x + 3, 125 - height, 15, ink, 650);
        text(
          card.visual === "inflation"
            ? ["Base year", "+6%", "+3%"][i]
            : ["Base", "Nominal", "Real"][i],
          x,
          154,
          10,
        );
      });
      line(
        [
          [30, 135],
          [325, 135],
        ],
        axis,
        1,
      );
    } else if (card.visual === "elasticity" && card.diagram) {
      const graph = card.diagram;
      const left = 48, right = 314, top = 30, bottom = 110;
      const position = ({ quantity, price }) => [
        left + (quantity - graph.quantityRange[0]) / (graph.quantityRange[1] - graph.quantityRange[0]) * (right - left),
        bottom - (price - graph.priceRange[0]) / (graph.priceRange[1] - graph.priceRange[0]) * (bottom - top),
      ];
      text(graph.priceAxis, left, 12, 11, ink, 650);
      text(graph.assumption, 174, 23, 9);
      line([[left, top - 5], [left, bottom], [right + 10, bottom]], axis, 1);
      // Clip the original linear model to the labelled price window, not a false origin.
      const quantityAt = price => graph.quantityIntercept * (1 - price / graph.priceIntercept);
      line(graph.priceRange.slice().reverse().map(price => position({ price, quantity: quantityAt(price) })), ink, 2.5);
      text("D", 288, 102, 11, ink, 650);
      graph.priceRange.forEach(price => text(String(price), left - 22, position({ price, quantity: 0 })[1] + 3, 10));
      text("0", left - 3, bottom + 13, 10);
      graph.points.forEach(point => {
        const [x, y] = position(point);
        line([[left, y], [x, y], [x, bottom]], axis, 1, [3, 3]);
        dot(x, y);
        text(String(point.price), left - 22, y + 3, 10);
        text(String(point.quantity), x - 8, bottom + 13, 10);
        text(point.label, x + 6, y - 6, 11, ink, 650);
      });
      const [a, b] = graph.points;
      const priceChange = (b.price - a.price) / a.price * 100;
      const quantityChange = (b.quantity - a.quantity) / a.quantity * 100;
      const ped = quantityChange / priceChange;
      text(graph.quantityAxis, 104, 137, 11, ink, 650);
      text(`Price axis starts at $${graph.priceRange[0]}; P = 15 - Q/20`, left, 151, 9);
      text(`${graph.method}: (${quantityChange}%)/(+${priceChange}%) = ${ped}`, left, 165, 11, ink, 650);
    } else if (card.visual === "elasticity") {
      text("PRICE", 35, 38, 10);
      text("QUANTITY DEMANDED", 168, 38, 10);
      text("+10%", 35, 96, 36, ink, 700);
      text("-20%", 168, 96, 36, ink, 700);
      line(
        [
          [35, 120],
          [134, 120],
        ],
        axis,
        4,
      );
      line(
        [
          [168, 120],
          [324, 120],
        ],
        ink,
        4,
      );
      text("A bigger proportional response", 35, 150, 11);
    } else if (card.visual === "currency") {
      text("1", 35, 100, 62, ink, 700);
      text("DOMESTIC UNIT", 35, 128, 9);
      line(
        [
          [134, 78],
          [215, 78],
        ],
        ink,
        2,
      );
      line(
        [
          [205, 68],
          [215, 78],
          [205, 88],
        ],
        ink,
        2,
      );
      text("More", 236, 80, 24, ink, 700);
      text("foreign currency", 236, 102, 11);
      text("AFTER APPRECIATION", 152, 145, 9);
    } else if (card.visual === "development") {
      ["INCOME", "HEALTH", "EDUCATION"].forEach((label, i) => {
        ctx.fillStyle = `${ink}18`;
        ctx.fillRect(17 + i * 115, 35, 103, 93);
        text(String(i + 1).padStart(2, "0"), 32 + i * 115, 77, 24, ink, 650);
        text(label, 32 + i * 115, 104, 8);
      });
      text("Different dimensions. A fuller picture.", 45, 156, 11);
    } else {
      text(
        card.visual === "custom" ? "YOUR PERSPECTIVE" : "ONE HOUR",
        26,
        35,
        10,
      );
      line(
        [
          [26, 71],
          [334, 71],
        ],
        `${ink}33`,
        20,
      );
      line(
        [
          [26, 71],
          [180, 71],
        ],
        ink,
        20,
      );
      text(
        card.visual === "custom" ? "Your" : "Revision",
        26,
        114,
        19,
        ink,
        650,
      );
      text(
        card.visual === "custom" ? "idea." : "Football",
        220,
        114,
        19,
        ink,
        650,
      );
      text(
        card.visual === "custom"
          ? "Make the idea your own."
          : "Choosing one means giving up the other.",
        26,
        151,
        10,
      );
    }
  }
  function detail(id, connectionsOnly = false) {
    const card = findCard(id);
    if (!card) return;
    openModal(
      `<div class="detail-heading"><h2>${escape(card.topic)}</h2>${closeButton()}</div><span class="badge" data-subject="${subjectOf(card)}">${card.visual === "development" ? "Economic development" : unitOf(card).name}</span><p class="detail-answer">${escape(card.answer)}</p>${!connectionsOnly ? `<div class="detail-section distinction-note"><h3>Watch the distinction</h3><p>${escape(card.trap)}</p></div><div class="detail-section"><h3>Key distinctions</h3><ul class="check-list">${card.rubric.map((point) => `<li>${escape(point)}</li>`).join("") || "<li>Check the source and the explanation.</li>"}</ul></div>` : ""}<div class="detail-section"><h3>Connected ideas</h3><div class="related-links">${
        card.related
          .map((id) => findCard(id))
          .filter(Boolean)
          .map(
            (c) =>
              `<button data-action="detail" data-id="${c.id}">${escape(c.topic)}</button>`,
          )
          .join("") || "<p>No linked cards yet.</p>"
      }</div></div><div class="detail-section"><h3>Content provenance</h3><p>${escape(card.source)}. ${card.id.startsWith("custom-") ? "Locally reviewed personal card; not teacher verified." : escape(card.editorialStatus || "Independent sample content; not an official IB question or teacher-verified explanation.")}</p></div><div class="dialog-actions">${button("Open in feed", "study", "arrow-right", `data-id="${escape(card.id)}"`)}</div>`,
    );
  }
  function renderStudio() {
    const pending = state.submissions.filter(
      (s) => s.status === "pending",
    ).length;
    $("#main").innerHTML =
      `${heading("Card studio", "Keep one useful idea worth coming back to.", '<span class="badge">Local workspace</span>')}<div class="studio-tabs" role="tablist" aria-label="Card studio views">${[
        ["create", "Create a card"],
        ["review", `Review queue (${pending})`],
        ["history", "My submissions"],
      ]
        .map(
          ([id, label]) =>
            `<button role="tab" aria-selected="${studioTab === id}" class="${studioTab === id ? "active" : ""}" data-action="studio-tab" data-tab="${id}">${label}</button>`,
        )
        .join("")}</div><div id="studioContent"></div>`;
    if (studioTab === "create") {
      const draft = state.submissions.find((s) => s.id === editing) || {};
      $("#studioContent").innerHTML =
        `<div class="studio-layout"><form id="cardForm"><div class="form-grid"><label class="field">Card title<input name="title" maxlength="80" required placeholder="e.g. When a tax changes a market" value="${escape(draft.title || "")}" /></label><label class="field">Unit<select name="unit">${units.map((u) => `<option value="${u.id}" ${draft.unit === u.id ? "selected" : ""}>${u.name}</option>`).join("")}</select></label></div><label class="field">Knowledge point<textarea name="question" maxlength="130" required placeholder="State one clear knowledge point.">${escape(draft.question || "")}</textarea></label><label class="field">Immediate explanation<textarea name="answer" maxlength="480" required placeholder="Explain the point in a few sentences.">${escape(draft.authored?.summary || draft.answer || "")}</textarea></label><label class="field">Closer-look notes<textarea name="notes" maxlength="1600" placeholder="Optional assumptions or deeper explanation.">${escape(draft.authored?.notes || "")}</textarea></label><label class="field">Source &amp; page reference<input name="source" maxlength="300" placeholder="Original scenario, or a source with a page reference" value="${escape(draft.source || "")}"/><small>Keep private textbook extracts and personal information out of the card.</small></label>${draft.feedback ? `<div class="review-warning">Review note: ${escape(draft.feedback)}</div>` : ""}<div class="form-actions"><button type="submit" class="btn primary">${editing ? "Resubmit for review" : "Submit for review"}${icon("arrow-right")}</button><span class="screening-label">Saved on this device only</span></div></form><aside class="form-aside"><h3>A useful revision card</h3><p>One idea with an immediate explanation. Add assumptions and deeper context in the notes.</p><h3>Before it joins your library</h3><ul class="check-list"><li>Check for an existing question</li><li>Include a traceable source</li><li>Review the economics and wording</li></ul><div class="note">Automated checks cover completeness and exact duplicates. Accuracy still needs a human review.</div></aside></div>`;
    } else {
      const list = [...state.submissions]
        .reverse()
        .filter((s) => studioTab !== "review" || s.status === "pending");
      $("#studioContent").innerHTML =
        `<p class="studio-header-note">${icon("hard-drive")}Personal review workflow. Approval adds a card to this device's library only.</p><div style="margin-top:26px">${list.length ? list.map((s) => `<article class="review-row"><span class="unit-icon ${unitOf(s).color}">${icon(unitOf(s).icon)}</span><div class="review-row-body"><span class="badge ${s.status === "approved" ? "green" : "yellow"}">${s.status === "approved" ? "In your library" : s.status === "returned" ? "Changes requested" : "Awaiting review"}</span><h3>${escape(s.title)}</h3><p>${escape(s.question)}</p></div>${button(s.status === "returned" ? "Revise" : "Review", s.status === "returned" ? "edit-submission" : "review-submission", "arrow-up-right", `data-id="${escape(s.id)}"`, "")}</article>`).join("") : empty(studioTab === "review" ? "Nothing waiting for review" : "Your ideas start here", "Submit an original question to begin your personal card collection.", button("Create a card", "create", "plus"), "square-pen")}</div>`;
    }
  }
  const flagLabels = {
    missing_source: "Source reference is missing",
    short_question: "Question may need more context",
    short_answer: "Answer may need a fuller explanation",
    duplicate_question: "An identical question already exists",
    ambiguous: "Question may be ambiguous",
    unsupported: "Source may not support the answer",
    level_mismatch: "Course level needs checking",
  };
  function reviewSubmission(id) {
    const item = state.submissions.find((s) => s.id === id);
    if (!item) return;
    openModal(
      `<div class="detail-heading"><h2>Review card</h2>${closeButton()}</div><span class="badge">${escape(unitOf(item).name)}</span><h3 style="margin-top:20px">${escape(item.title)}</h3><p class="detail-answer">${escape(item.question)}</p><div class="detail-section"><h3>Reference answer</h3><p>${escape(item.answer)}</p></div><div class="detail-section"><h3>Source</h3><p>${escape(item.source || "No source provided")}</p></div><div class="detail-section"><h3>Pre-review checks</h3><p>${item.screening?.flags?.length ? item.screening.flags.map((f) => escape(flagLabels[f] || "Review needed")).join("<br>") : "No completeness or exact-duplicate flags."}</p><p class="screening-label">Local checks only. Factual accuracy has not been assessed automatically.</p></div>${item.status === "pending" ? `<form id="reviewForm" data-id="${escape(item.id)}"><label class="field">Review note<textarea name="feedback" maxlength="1000" placeholder="What should the author check or change?"></textarea></label><label class="subtle"><input type="checkbox" id="reviewConfirmed" /> I checked the answer and source for personal use.</label><div class="dialog-actions">${button("Request changes", "return-submission", "undo-2", `data-id="${escape(item.id)}"`, "")}<button class="btn primary" type="submit">Add to my library ${icon("check")}</button></div></form>` : `<div class="review-warning">${item.status === "approved" ? "Approved locally for personal practice. This does not indicate teacher approval or public-use permission." : escape(item.feedback || "Changes requested.")}</div>`}`,
    );
  }
  function settings() {
    openModal(
      `<div class="detail-heading"><h2>Study settings</h2>${closeButton()}</div><form id="settingsForm"><div class="settings-row"><label for="dailyGoal">Legacy recall goal<small>Retained for your earlier review data; not used by the refresh feed.</small></label><input id="dailyGoal" name="goal" type="number" min="1" max="30" step="1" required value="${state.goal}" /></div><div class="settings-row"><p>Your study data<small>Reviews, saved cards, and personal submissions.</small></p>${button("Export data", "export", "download", 'type="button"', "")}</div><div class="settings-row"><p>Review history<small>Reset scheduling. Keep saved cards and submissions.</small></p><button type="button" class="text-button danger-button" data-action="reset-confirm">Reset reviews</button></div><div class="dialog-actions"><button type="submit" class="btn primary">Save settings ${icon("check")}</button></div></form>`,
    );
  }
  function advance(step) {
    if (!session) return;
    const list=feedSelection(), current=list.findIndex(c=>c.id===activeCard()?.id), next=list[current+step];
    if(!next) return;
    const node=document.querySelector(`[data-point="${CSS.escape(next.id)}"]`);
    $(".refresh-scroll").scrollTo({top:node.offsetTop,behavior:"instant"});
  }
  document.addEventListener("click", async (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav && ["units", "saved"].includes(nav.dataset.nav)) {
      filter = "all";
      search = "";
      if (nav.dataset.nav === route) renderLibrary();
    }
    const unitLink = event.target.closest("[data-unit-link]");
    if (unitLink) {
      filter = unitLink.dataset.unitLink;
      search = "";
      if (route === "units") renderLibrary();
    }
    const target = event.target.closest("[data-action]");
    if (!target || target.disabled) return;
    const { action, id } = target.dataset;
    if (action === "help") openModal(`<div class="detail-heading"><h2>Your study space</h2>${closeButton()}</div><p class="detail-answer">Start with Refresh to explore one idea at a time. Use the topic library to find a concept, or save cards to return to them later.</p><div class="detail-section"><h3>Your progress stays here</h3><p>Saved cards and browsing activity are stored on this device. Browsing is not a test of recall. Use Study settings to export your data.</p></div><div class="dialog-actions">${button("Open study settings", "settings", "settings-2")}</div>`);
    if (action === "close") $("#modal").close();
    if (action === "start") {
      feedFilter = "all";
      newSession();
      navigate("feed");
    }
    if (action === "overview" || action === "end-session") {
      session = null;
      navigate("progress");
    }
    if (action === "browse" || action === "clear-filters") {
      filter = "all";
      search = "";
      navigate("units");
    }
    if (action === "search") {
      filter = "all";
      search = "";
      navigate("units");
      setTimeout(() => $("#topicSearch")?.focus(), 60);
    }
    if (action === "filter") {
      filter = target.dataset.unit;
      renderLibrary();
    }
    if (action === "study") {
      $("#modal").close();
      feedFilter = "all";
      newSession();
      session.index = session.ids.indexOf(id);
      navigate("feed");
    }
    if (action === "detail" || action === "connections")
      detail(id, action === "connections");
    if (action === "save") {
      state.saved = state.saved.includes(id)
        ? state.saved.filter((x) => x !== id)
        : [...state.saved, id];
      const persisted = save();
      if (route === "feed") {
        syncCardPreferences(id);
        if (feedFilter === "saved" && !state.saved.includes(id)) renderFeed();
      } else renderLibraryResults();
      if (persisted)
        toast(
          state.saved.includes(id)
            ? "Added to saved cards"
            : "Removed from saved cards",
        );
    }
    if (action === "feed-filter") { feedFilter=target.dataset.filter; renderFeed(); }
    if (action === "feed-jump") {
      const point = document.querySelector(`[data-point="${CSS.escape(id)}"]`);
      if (point) $(".refresh-scroll").scrollTo({top:point.offsetTop,behavior:"instant"});
    }
    if (action === "revisit" || action === "confusing") {
      EconRefresh.toggle(refreshState,action,id); saveRefresh();
      syncCardPreferences(id);
      $("#navDue").textContent=refreshState.revisit.length;
      if(feedFilter==="revisit" && action==="revisit") renderFeed();
      toast(refreshState[action].includes(id) ? (action==="revisit" ? "Set aside to revisit" : "Flagged as confusing") : "Removed");
    }
    if (action === "next") advance(1);
    if (action === "previous") advance(-1);
    if (action === "settings") settings();
    if (action === "create") {
      editing = null;
      studioTab = "create";
      navigate("studio");
    }
    if (action === "studio-tab") {
      studioTab = target.dataset.tab;
      editing = null;
      renderStudio();
      icons();
    }
    if (action === "review-submission") reviewSubmission(id);
    if (action === "edit-submission") {
      editing = id;
      studioTab = "create";
      renderStudio();
      icons();
    }
    if (action === "return-submission") {
      const feedback = $("#reviewForm textarea").value.trim();
      if (!feedback) {
        toast("Add a review note before requesting changes.");
        $("#reviewForm textarea").focus();
        return;
      }
      const item = state.submissions.find((s) => s.id === id);
      if (item?.status !== "pending") return;
      item.status = "returned";
      item.feedback = feedback;
      save();
      $("#modal").close();
      renderStudio();
      icons();
    }
    if (action === "export") {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify({ learning: state, browsing: refreshState }, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `econ-study-${L.dayKey()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (action === "reset-confirm")
      openModal(
        `<div class="detail-heading"><h2>Reset your review history?</h2>${closeButton()}</div><p class="subtle">This clears your recall statistics and review schedule. Saved cards and personal submissions stay here.</p><div class="dialog-actions">${button("Cancel", "close", "x", "", "")}${button("Reset reviews", "reset", "rotate-ccw", "", "dark")}</div>`,
      );
    if (action === "reset") {
      state.cards = {};
      state.logs = [];
      state.legacySeen = [];
      session = null;
      save();
      $("#modal").close();
      render();
      toast("Review history reset");
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "topicSearch") {
      search = event.target.value;
      renderLibraryResults();
    }
  });
  document.addEventListener("submit", async (event) => {
    if (!["cardForm", "reviewForm", "settingsForm"].includes(event.target.id))
      return;
    event.preventDefault();
    const form = event.target,
      data = Object.fromEntries(new FormData(form));
    if (form.id === "settingsForm") {
      state.goal = Math.max(
        1,
        Math.min(30, Math.round(Number(data.goal) || 5)),
      );
      save();
      $("#modal").close();
      render();
    }
    if (form.id === "cardForm") {
      if (![data.title, data.question, data.answer].every((v) => v.trim())) {
        toast("Add a title, question, and answer.");
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      const previous = state.submissions.find((s) => s.id === editing);
      const candidate = {
        id: previous?.id || `custom-${crypto.randomUUID()}`, revision: (previous?.version || 0) + 1,
        unit: data.unit, topic: data.title.trim(), title: data.title.trim(),
        headline: data.question.trim(), summary: data.answer.trim(), notes: data.notes?.trim() || data.answer.trim(),
        takeaway: "", caution: "Personal content; source and economics require review.", related: [],
        sources: [{ id: "original", page: null }], level: "unmapped", graphId: null,
      };
      const validation = EconCards.validateCard(candidate);
      if (!validation.valid) { submit.disabled = false; toast(validation.errors[0]); return; }
      const card = {
        id: candidate.id,
        authored: candidate,
        refresh: { headline: candidate.headline, summary: candidate.summary },
        title: data.title.trim(),
        question: data.question.trim(),
        answer: candidate.notes,
        source: data.source.trim(),
        unit: data.unit,
        status: "pending",
        createdAt: previous?.createdAt || new Date().toISOString(),
        version: candidate.revision,
      };
      card.screening = await decisions.screenSubmission({
        card,
        existingCards: [
          ...cards(),
          ...state.submissions.filter((s) => s.status !== "approved"),
        ].filter((c) => c.id !== card.id),
      });
      state.submissions = [
        ...state.submissions.filter((s) => s.id !== card.id),
        card,
      ];
      const persisted = save();
      editing = null;
      studioTab = "review";
      if (route === "studio") {
        renderStudio();
        icons();
      }
      if (persisted) toast("Card added to your local review queue");
    }
    if (form.id === "reviewForm") {
      if (!$("#reviewConfirmed").checked) {
        toast("Confirm you have checked the answer and source.");
        return;
      }
      const card = state.submissions.find((s) => s.id === form.dataset.id);
      if (!card || card.status !== "pending") return;
      if (!card.source) {
        toast("Request changes to add a source before approval.");
        return;
      }
      card.status = "approved";
      card.feedback = data.feedback.trim();
      card.reviewedAt = new Date().toISOString();
      card.approval = "local_personal_review";
      const persisted = save();
      $("#modal").close();
      renderStudio();
      icons();
      if (persisted) toast("Added to your personal topic library");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (
      route !== "feed" ||
      document.querySelector("dialog[open]") ||
      event.target.closest("input,textarea,select,button")
    )
      return;
    if (["ArrowDown", "PageDown"].includes(event.key)) {
      event.preventDefault();
      advance(1);
    }
    if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      advance(-1);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if(!document.hidden && route==="feed" && activeCard() && $(".refresh-scroll")) {
      EconRefresh.open(refreshState,activeCard().id); saveRefresh();
    }
  });
  window.addEventListener("hashchange", () => {
    render();
    window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
  });
  // The skip link targets #main without touching the hash, so activating it
  // never changes the route; focus lands in the main content.
  $(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    $("#main").focus({ preventScroll: false });
  });

  // Native dialog handles Escape and focus restoration. Only actual backdrop clicks close it.
  const modal = $("#modal");
  let backdropDown = false;
  modal.addEventListener("close", () => {
    if (modalOpener && !modalOpener.getClientRects().length) $(".refresh-scroll")?.focus({ preventScroll: true });
    modalOpener = null;
  });
  const outsideModal = event => {
    const rect = modal.getBoundingClientRect();
    return event.target === modal && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  modal.addEventListener("pointerdown", event => { backdropDown = outsideModal(event); });
  modal.addEventListener("click", event => { if (backdropDown && outsideModal(event)) modal.close(); backdropDown = false; });
  new MutationObserver(() => {
    document.querySelectorAll("canvas[data-concept]").forEach(canvas => drawConcept(findCard(canvas.dataset.concept), canvas));
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("econ:catalog-change", () => { session = null; render(); });
  render();
})();
