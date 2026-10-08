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
  let session = null, feedFilter = "all", feedObserver;
  let refreshState;
  try { refreshState = EconRefresh.load(localStorage, [...EconData.cards, ...state.submissions.filter(s => s.status === "approved")].map(c => c.id)); }
  catch { refreshState = EconRefresh.empty(); }
  let toastTimer;
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
    $("#modalContent").innerHTML = content;
    icons();
    if (!$("#modal").open) $("#modal").showModal();
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
      (["progress", "feed", "units", "saved", "studio"].includes(hash)
        ? hash
        : "feed");
    feedObserver?.disconnect();
    document.body.classList.toggle("feed-mode", route === "feed");
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === route);
      if (a.dataset.nav === route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const labels = {
      progress: "Overview",
      feed: "Refresh",
      units: "Topic library",
      saved: "Saved cards",
      studio: "Card studio",
    };
    $("#viewLabel").textContent = labels[route];
    document.title = `${labels[route]} / Econ`;
    $("#navDue").textContent = refreshState.revisit.length;
    $("#navDue").title = "Points set aside to revisit";
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
  function renderDashboard() {
    const all = cards();
    const opened = all.filter(c => refreshState.opened[c.id]);
    const today = opened.filter(c => L.dayKey(refreshState.opened[c.id]) === L.dayKey()).length;
    const stat = (label, value, symbol) => `<div class="stat"><div class="stat-top"><span class="stat-symbol">${icon(symbol)}</span>${label}</div><strong class="stat-value">${value}</strong></div>`;
    $("#main").innerHTML = `${heading("Your overview", "Browsing activity, not a measure of recall.", button("Continue refreshing", "start", "play"))}
      <section class="stats-grid" aria-label="Browsing statistics">${stat("Points opened", opened.length + "<small> / " + all.length + "</small>", "eye")}${stat("Opened today", today, "calendar-days")}${stat("Saved points", state.saved.length, "bookmark")}${stat("Set aside to revisit", refreshState.revisit.length, "history")}</section>
      <section><div class="section-heading"><h2>Your topics</h2><a class="text-button" href="#units">Topic library ${icon("arrow-up-right")}</a></div><div class="topic-grid">${units.map(u => {
        const list=all.filter(c=>c.unit===u.id), seen=list.filter(c=>refreshState.opened[c.id]).length;
        return `<a href="#units" class="topic-card" data-unit-link="${u.id}"><img class="topic-photo" src="${u.image}" alt="${u.name} topic photograph"/><div class="topic-info"><span class="eyebrow">UNIT ${u.number}</span><h3>${u.name}</h3><p>${u.description}</p><div class="topic-meta"><span>${list.length} points</span><span>${seen} opened</span></div></div></a>`;
      }).join("")}</div></section>
      <div class="overview-bottom"><section class="refresh-overview-list"><div class="section-heading"><h2>Recently opened</h2><span class="subtle">Your browsing</span></div>${opened.length ? [...opened].sort((a,b)=>new Date(refreshState.opened[b.id])-new Date(refreshState.opened[a.id])).slice(0,4).map(c=>`<button class="refresh-topic-row" data-action="study" data-id="${escape(c.id)}"><span class="unit-icon ${unitOf(c).color}">${icon(unitOf(c).icon)}</span><span><strong>${escape(c.topic)}</strong><small>${escape(unitOf(c).name)}</small></span>${icon("arrow-up-right")}</button>`).join("") : '<p class="subtle">Your opened points will appear here.</p>'}</section>
      <section class="refresh-overview-list"><div class="section-heading"><h2>Set aside</h2><span class="subtle">Chosen by you</span></div>${refreshState.revisit.length ? refreshState.revisit.map(id=>findCard(id)).filter(Boolean).map(c=>`<button class="refresh-topic-row" data-action="study" data-id="${escape(c.id)}"><span class="unit-icon ${unitOf(c).color}">${icon("history")}</span><span><strong>${escape(c.topic)}</strong><small>${escape(unitOf(c).name)}</small></span>${icon("arrow-up-right")}</button>`).join("") : '<p class="subtle">No points set aside to revisit yet.</p>'}</section></div>`;
  }
  function libraryCard(card) {
    const unit = unitOf(card),
      saved = state.saved.includes(card.id);
    return `<article class="library-card"><div class="library-art"><img src="${unit.image}" alt="${unit.name} topic photograph" loading="lazy"/><span class="image-tag">${escape(card.tag)}</span></div><div class="library-body"><div><span class="badge ${unit.color}">${escape(unit.name)}</span> <span class="badge">${escape(status(card))}</span></div><h3>${escape(card.topic)}</h3><p>${escape(refreshCopy(card).summary)}</p><div class="library-bottom"><button class="text-button" data-action="study" data-id="${escape(card.id)}">Open point ${icon("arrow-right")}</button><div><button class="icon-button" data-action="detail" data-id="${escape(card.id)}" title="Open notes" aria-label="Notes for ${escape(card.topic)}">${icon("book-open")}</button> <button class="icon-button ${saved ? "selected" : ""}" data-action="save" data-id="${escape(card.id)}" aria-pressed="${saved}" title="${saved ? "Remove bookmark" : "Save card"}" aria-label="${saved ? "Unsave" : "Save"} ${escape(card.topic)}">${icon("bookmark")}</button></div></div></div></article>`;
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
    $('[data-action="previous"]').disabled=current<=0;
    $('[data-action="next"]').disabled=current>=list.length-1;
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
  function refreshPoint(card, index, count) {
    const copy = refreshCopy(card), unit = unitOf(card);
    return `<article class="refresh-point" data-point="${escape(card.id)}" aria-label="${index + 1} of ${count}: ${escape(card.topic)}">
      <div class="refresh-body"><div class="refresh-meta"><span class="refresh-unit">${icon(unit.icon)}${escape(unit.name)}</span><span>${String(index + 1).padStart(2,"0")} / ${String(count).padStart(2,"0")}</span></div>
        <h2>${escape(copy.headline)}</h2><p class="refresh-summary">${escape(copy.summary)}</p>
        <div class="refresh-art"><div class="visual-label"><span>${escape(card.topic)}</span>${icon("chart-no-axes-combined")}</div><canvas data-concept="${escape(card.id)}" role="img" aria-label="${escape(visualLabel(card))}"></canvas><small>Original illustrative example</small></div>
        ${card.takeaway ? `<p class="refresh-takeaway">${icon("lightbulb")}<span>${escape(card.takeaway)}</span></p>` : ""}
      </div><footer class="refresh-actions"><button data-action="detail" data-id="${escape(card.id)}">${icon("book-open")}Closer look${icon("arrow-up-right")}</button><div>
        ${[["save","bookmark","Save point",state.saved.includes(card.id)],["revisit","history","Revisit later",refreshState.revisit.includes(card.id)],["confusing","flag","Flag as confusing",refreshState.confusing.includes(card.id)]].map(([a,s,l,on])=>`<button class="icon-button" data-action="${a}" data-id="${escape(card.id)}" aria-label="${l}" title="${l}" aria-pressed="${on}">${icon(s)}</button>`).join("")}
      </div></footer></article>`;
  }
  function renderFeed() {
    feedObserver?.disconnect();
    const list=feedSelection();
    $("#main").innerHTML=`<section class="refresh-stage"><header class="refresh-heading"><div><span class="eyebrow">YOUR DAILY PERSPECTIVE</span><h1>Economics, refreshed.</h1></div><div class="refresh-filters" role="group" aria-label="Feed selection">${[["all","All"],["saved","Saved"],["revisit","Revisit"]].map(([v,l])=>`<button data-action="feed-filter" data-filter="${v}" aria-pressed="${feedFilter===v}">${l}</button>`).join("")}</div></header>
    ${list.length ? `<div class="refresh-workspace"><div class="refresh-scroll" tabindex="0" aria-label="Knowledge refresh feed">${list.map((card,i)=>refreshPoint(card,i,list.length)).join("")}</div>
      <aside class="refresh-queue" aria-label="Points in this set"><div class="queue-heading"><span>In this set</span><span>${list.length} points</span></div><div class="queue-list">${list.map((card,i)=>`<button data-action="feed-jump" data-feed-jump data-id="${escape(card.id)}" title="Open ${escape(card.topic)}"><span class="queue-number">${String(i+1).padStart(2,"0")}</span><span><strong>${escape(card.topic)}</strong><small>${escape(unitOf(card).name)}</small></span>${icon("arrow-up-right")}</button>`).join("")}</div><a href="#units" class="queue-library">${icon("library")}Explore the library${icon("arrow-right")}</a></aside></div>
      <footer class="refresh-controls"><div class="set-position"><span id="refreshPosition" aria-live="polite"></span><div class="set-progress" role="progressbar" aria-label="Position in this set" aria-valuemin="1" aria-valuemax="${list.length}" aria-valuenow="1"><span></span></div></div><div><button class="icon-button" data-action="previous" aria-label="Previous point" title="Previous point">${icon("arrow-up")}</button><button class="icon-button" data-action="next" aria-label="Next point" title="Next point">${icon("arrow-down")}</button></div></footer>` : `<div class="refresh-empty">${empty(feedFilter==="saved" ? "No saved points yet" : "Nothing set aside", "", button("Back to all points","feed-filter","arrow-right",'data-filter="all"',"lime"),"bookmark")}</div>`}</section>`;
    icons(); if(!list.length) return;
    list.forEach(card=>drawConcept(card, document.querySelector(`[data-concept="${CSS.escape(card.id)}"]`)));
    const current=list.find(c=>c.id===activeCard()?.id) || list[0];
    session.index=session.ids.indexOf(current.id);
    const scroller=$(".refresh-scroll"), node=document.querySelector(`[data-point="${CSS.escape(current.id)}"]`);
    scroller.scrollTo({top:node.offsetTop,behavior:"instant"}); feedPosition();
    feedObserver=new IntersectionObserver(entries=>{
      for(const entry of entries) if(entry.isIntersecting && entry.intersectionRatio>=.65 && entry.target.isConnected && route==="feed") {
        const id=entry.target.dataset.point;session.index=session.ids.indexOf(id);feedPosition();
        if(!document.hidden){EconRefresh.open(refreshState,id);saveRefresh();}
      }
    },{root:scroller,threshold:.65});
    scroller.querySelectorAll("[data-point]").forEach(el=>feedObserver.observe(el));
  }
  function visualLabel(card) {
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
    const scale = Math.max(2, devicePixelRatio || 1);
    canvas.width = 360 * scale;
    canvas.height = 170 * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    const unit = unitOf(card),
      ink = {
        green: "#436445",
        blue: "#486786",
        pink: "#9b6857",
        yellow: "#8d7b45",
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
    const text = (label, x, y, size = 11, color = ink, weight = 500) => {
      ctx.fillStyle = color;
      ctx.font = `${weight} ${size}px 'DM Sans', sans-serif`;
      ctx.fillText(label, x, y);
    };
    const dot = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
    };
    if (["externality", "demand"].includes(card.visual)) {
      line(
        [
          [35, 12],
          [35, 142],
          [318, 142],
        ],
        `${ink}66`,
        1,
      );
      text("P", 15, 22, 10);
      text("Q", 322, 146, 10);
      line(
        [
          [47, 25],
          [285, 122],
        ],
        ink,
        2.5,
      );
      text("D", 293, 126, 10);
      if (card.visual === "externality") {
        line(
          [
            [70, 145],
            [254, 22],
          ],
          "#698d60",
          2.5,
        );
        text("MSC", 254, 17, 10);
        line(
          [
            [106, 146],
            [286, 30],
          ],
          "#a28a58",
          2.5,
        );
        text("MPC", 294, 31, 10);
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
        ctx.fillStyle = "#ba8d5538";
        ctx.beginPath();
        ctx.moveTo(...qS);
        ctx.lineTo(...qM);
        ctx.lineTo(qM[0], 145 - ((qM[0] - 70) * 123) / 184);
        ctx.closePath();
        ctx.fill();
        [qS, qM].forEach((p) => {
          line([p, [p[0], 142]], `${ink}77`, 1, [4, 4]);
          dot(...p);
        });
        text("Qs", qS[0] - 8, 158, 10);
        text("Qm", qM[0] - 7, 158, 10);
      } else {
        [
          [114, 52],
          [226, 98],
        ].forEach((p) => {
          line([[35, p[1]], p, [p[0], 142]], `${ink}66`, 1, [4, 4]);
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
        ctx.fillStyle = i === 2 ? ink : `${ink}66`;
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
        `${ink}55`,
        1,
      );
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
        `${ink}66`,
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
      `<div class="detail-heading"><h2>${escape(card.topic)}</h2>${closeButton()}</div><span class="badge ${unitOf(card).color}">${unitOf(card).name}</span><p class="detail-answer">${escape(card.answer)}</p>${!connectionsOnly ? `<div class="detail-section"><h3>Watch the distinction</h3><p>${escape(card.trap)}</p></div><div class="detail-section"><h3>Key distinctions</h3><ul class="check-list">${card.rubric.map((point) => `<li>${icon("check")}${escape(point)}</li>`).join("") || "<li>Check the source and the explanation.</li>"}</ul></div>` : ""}<div class="detail-section"><h3>Connected ideas</h3><div class="related-links">${
        card.related
          .map((id) => findCard(id))
          .filter(Boolean)
          .map(
            (c) =>
              `<button data-action="detail" data-id="${c.id}">${escape(c.topic)}</button>`,
          )
          .join("") || "<p>No linked cards yet.</p>"
      }</div></div><div class="detail-section"><h3>Content provenance</h3><p>${escape(card.source)}. ${card.id.startsWith("custom-") ? "Locally reviewed personal card; not teacher verified." : "Independent sample content; not an official IB question or teacher-verified explanation."}</p></div><div class="dialog-actions">${button("Open in feed", "study", "arrow-right", `data-id="${escape(card.id)}"`)}</div>`,
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
        `<div class="studio-layout"><form id="cardForm"><div class="form-grid"><label class="field">Card title<input name="title" maxlength="80" required placeholder="e.g. When a tax changes a market" value="${escape(draft.title || "")}" /></label><label class="field">Unit<select name="unit">${units.map((u) => `<option value="${u.id}" ${draft.unit === u.id ? "selected" : ""}>${u.name}</option>`).join("")}</select></label></div><label class="field">Recall question<textarea name="question" maxlength="600" required placeholder="Ask one clear question.">${escape(draft.question || "")}</textarea></label><label class="field">Reference answer<textarea name="answer" maxlength="1600" required placeholder="Give the answer, then explain the reasoning.">${escape(draft.answer || "")}</textarea></label><label class="field">Source &amp; page reference<input name="source" maxlength="300" placeholder="Original scenario, or a source with a page reference" value="${escape(draft.source || "")}"/><small>Keep private textbook extracts and personal information out of the card.</small></label>${draft.feedback ? `<div class="review-warning">Review note: ${escape(draft.feedback)}</div>` : ""}<div class="form-actions"><button type="submit" class="btn primary">${editing ? "Resubmit for review" : "Submit for review"}${icon("arrow-right")}</button><span class="screening-label">Saved on this device only</span></div></form><aside class="form-aside"><h3>A useful revision card</h3><p>One idea. One question. Enough context to answer without guessing what the author meant.</p><h3>Before it joins your library</h3><ul class="check-list"><li>${icon("check")}Check for an existing question</li><li>${icon("check")}Include a traceable source</li><li>${icon("check")}Review the economics and wording</li></ul><div class="note">Automated checks cover completeness and exact duplicates. Accuracy still needs a human review.</div></aside></div>`;
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
    $(".refresh-scroll").scrollTo({top:node.offsetTop,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
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
        target.setAttribute("aria-pressed", String(state.saved.includes(id)));
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
      if (point) $(".refresh-scroll").scrollTo({top:point.offsetTop,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
    }
    if (action === "revisit" || action === "confusing") {
      EconRefresh.toggle(refreshState,action,id); saveRefresh();
      target.setAttribute("aria-pressed", String(refreshState[action].includes(id)));
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
      const card = {
        id: previous?.id || `custom-${crypto.randomUUID()}`,
        title: data.title.trim(),
        question: data.question.trim(),
        answer: data.answer.trim(),
        source: data.source.trim(),
        unit: data.unit,
        status: "pending",
        createdAt: previous?.createdAt || new Date().toISOString(),
        version: (previous?.version || 0) + 1,
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
      $("#modal").open ||
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
  render();
})();
