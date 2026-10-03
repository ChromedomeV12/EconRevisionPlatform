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
  let route = "progress",
    filter = "all",
    search = "",
    studioTab = "create",
    editing = null;
  let session = null,
    revealed = false,
    answerDraft = "",
    assessment = null,
    revealing = false;
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
  function interval(due, now = new Date()) {
    const minutes = Math.max(1, Math.round((new Date(due) - now) / 60000));
    return minutes < 60
      ? `${minutes} min`
      : minutes < 1440
        ? `${Math.round(minutes / 60)} hr`
        : `${Math.round(minutes / 1440)} days`;
  }
  function status(card) {
    if (!state.cards[card.id]) return "New";
    return new Date(state.cards[card.id].due) <= new Date()
      ? "Due now"
      : `In ${interval(state.cards[card.id].due)}`;
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
      top: "progress",
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
        : "progress");
    document.body.classList.toggle("feed-mode", route === "feed");
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === route);
      if (a.dataset.nav === route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const labels = {
      progress: "Overview",
      feed: "Study feed",
      units: "Topic library",
      saved: "Saved cards",
      studio: "Card studio",
    };
    $("#viewLabel").textContent = labels[route];
    document.title = `${labels[route]} / Econ`;
    $("#navDue").textContent = L.stats(state, cards()).due;
    if (route === "progress") renderDashboard();
    if (route === "units" || route === "saved") renderLibrary();
    if (route === "feed") {
      if (!session) newSession();
      renderFeed();
    }
    if (route === "studio") renderStudio();
    icons();
  }
  function renderDashboard() {
    const all = cards(),
      s = L.stats(state, all),
      queue = L.queue(all, state);
    const date = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
    const stat = (label, value, note, symbol) =>
      `<div class="stat"><div class="stat-top">${label}${icon(symbol)}</div><strong class="stat-value">${value}</strong><p class="stat-foot">${note}</p></div>`;
    const unitProgress = (unit) => {
      const list = all.filter((c) => c.unit === unit.id),
        reviewed = list.filter((c) => state.cards[c.id]).length;
      return {
        list,
        reviewed,
        pct: list.length ? (reviewed / list.length) * 100 : 0,
      };
    };
    const activity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      return {
        date,
        count: state.logs.filter((l) => L.dayKey(l.at) === L.dayKey(date))
          .length,
      };
    });
    const max = Math.max(5, ...activity.map((d) => d.count));
    $("#main").innerHTML =
      `${heading("Your study desk", date, button("Start a session", "start", "arrow-up-right"))}
      ${state.legacySeen.length && !s.total ? '<div class="legacy-note">Your previously viewed topics are preserved. Complete a recall check to start your new review schedule.</div>' : ""}
      <section class="stats-grid" aria-label="Study statistics">
        ${stat("Reviews due", s.due, `<span>${s.fresh} new cards</span> to explore`, "layers-2")}
        ${stat("Cards reviewed", `${s.reviewed}<small> / ${all.length}</small>`, "Across your topic library", "circle-check")}
        ${stat("Recall rate", s.recall === null ? "&mdash;" : `${s.recall}<small>%</small>`, s.total ? "Self-rated Good or Easy" : "After your first recall check", "chart-no-axes-combined")}
        ${stat("Study streak", `${s.streak}<small> ${s.streak === 1 ? "day" : "days"}</small>`, s.streak ? "Keep your daily practice going" : "Your first day starts here", "flame")}
      </section>
      <div class="dashboard-columns"><div>
        <section aria-labelledby="nextHeading"><div class="section-heading"><h2 id="nextHeading">Up next</h2><span class="badge green">${queue.length ? "Ready when you are" : "All caught up"}</span></div>
        <div class="session-banner"><div><span class="eyebrow">YOUR DAILY SESSION</span><h2>${s.due ? "A good time to revisit." : s.fresh ? "Make room for a new idea." : "Today's work, done."}</h2><p>${s.due} due for revision &middot; ${s.fresh} new cards</p>${button(queue.length ? "Let's get into it" : "Browse your cards", queue.length ? "start" : "browse", "arrow-right", "", "lime")}</div><div class="session-stack" aria-hidden="true"><div class="mini-card"></div><div class="mini-card front">${icon("layers-2")}<strong>${Math.min(queue.length, state.goal)}</strong><span>cards in this session</span></div></div></div></section>
        <section><div class="section-heading"><h2>Explore your topics</h2><a class="text-button" href="#units">View library ${icon("arrow-up-right")}</a></div><div class="topic-grid">${units
          .slice(1)
          .map((u) => {
            const p = unitProgress(u);
            return `<a href="#units" class="topic-card" data-unit-link="${u.id}"><img class="topic-photo" src="${u.image}" alt="${u.id === "micro" ? "Fresh produce at a market" : u.id === "macro" ? "City office buildings" : "Shipping containers at a port"}" /><div class="topic-info"><span class="eyebrow">UNIT ${u.number}</span><h3>${u.name}</h3><p>${u.description}</p><div class="topic-meta"><span>${p.list.length} cards</span><span>${p.reviewed} reviewed</span></div><div class="mini-progress"><span style="width:${p.pct}%"></span></div></div></a>`;
          })
          .join("")}</div></section>
        <section class="activity"><div class="section-heading"><h2>Your week in revision</h2><span class="activity-key">${activity.reduce((n, d) => n + d.count, 0)} recall checks</span></div><div class="activity-chart" aria-label="Review activity over the last seven days">${activity.map((d, i) => `<div class="activity-day ${i === 6 ? "today" : ""}" title="${d.date.toLocaleDateString()}: ${d.count} reviews"><span>${d.count || ""}</span><div class="activity-bar" style="height:${Math.max(3, (d.count / max) * 56)}px"></div><span>${i === 6 ? "Today" : d.date.toLocaleDateString("en", { weekday: "short" })}</span></div>`).join("")}</div></section>
      </div><aside class="right-rail"><section><div class="goal-top"><h2>Daily goal</h2><button data-action="settings" aria-label="Change daily goal" title="Change daily goal">${icon("sliders-horizontal")}</button></div><div class="goal-ring" style="--progress:${Math.min(1, s.today / state.goal) * 360}deg"><div class="goal-core"><strong>${s.today}<span> / ${state.goal}</span></strong><small>recall checks today</small></div></div><p class="goal-caption">${s.today >= state.goal ? "Daily goal reached. Nicely done." : "A few focused minutes.<br>A little more that sticks."}</p></section>
      <section class="rail-section"><h2>Course progress</h2>${units
        .map((u) => {
          const p = unitProgress(u);
          return `<a class="unit-row" href="#units" data-unit-link="${u.id}"><span class="unit-icon ${u.color}">${icon(u.icon)}</span><div class="unit-row-body"><div class="unit-row-top">${u.name}<span>${p.reviewed}/${p.list.length}</span></div><div class="mini-progress"><span style="width:${p.pct}%"></span></div></div></a>`;
        })
        .join("")}</section>
      <section class="rail-section"><h2>Worth remembering</h2><div class="note"><strong>Seeing an answer isn't the same as recalling it.</strong><p>Try to retrieve the idea before you turn the card.</p></div></section></aside></div>`;
  }
  function libraryCard(card) {
    const unit = unitOf(card),
      saved = state.saved.includes(card.id);
    return `<article class="library-card"><div class="library-art"><img src="${unit.image}" alt="${unit.name} topic photograph" loading="lazy"/><span class="image-tag">${escape(card.tag)}</span></div><div class="library-body"><div><span class="badge ${unit.color}">${escape(unit.name)}</span> <span class="badge">${escape(status(card))}</span></div><h3>${escape(card.topic)}</h3><p>${escape(card.question)}</p><div class="library-bottom"><button class="text-button" data-action="study" data-id="${escape(card.id)}">Study card ${icon("arrow-right")}</button><div><button class="icon-button" data-action="detail" data-id="${escape(card.id)}" title="Open notes" aria-label="Notes for ${escape(card.topic)}">${icon("book-open")}</button> <button class="icon-button ${saved ? "selected" : ""}" data-action="save" data-id="${escape(card.id)}" aria-pressed="${saved}" title="${saved ? "Remove bookmark" : "Save card"}" aria-label="${saved ? "Unsave" : "Save"} ${escape(card.topic)}">${icon("bookmark")}</button></div></div></div></article>`;
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
    const selection =
      ids ||
      L.queue(cards(), state)
        .slice(0, state.goal)
        .map((c) => c.id);
    session = { ids: selection, index: 0, done: new Set(), start: Date.now() };
    revealed = false;
    answerDraft = "";
    assessment = null;
  }
  function activeCard() {
    return session && findCard(session.ids[session.index]);
  }
  function renderFeed() {
    const card = activeCard();
    const header = `<div class="feed-head"><div><h1>Study feed</h1><p class="subtle">${session.done.size} reviewed this session</p></div><div><span class="badge">${session.ids.length} cards</span> <button class="icon-button" data-action="end-session" title="End session" aria-label="End session">${icon("x")}</button></div></div>`;
    if (!card) {
      const remaining = L.queue(cards(), state).length;
      $("#main").innerHTML =
        `<div class="feed-shell">${header}<div class="feed-empty">${empty(session.ids.length ? "A little more that sticks." : "You're all caught up.", session.ids.length ? `${session.done.size} cards reviewed. ${session.ids.length - session.done.size} skipped. Your next reviews are scheduled.` : "No reviews due right now. Explore a topic or return when your cards are ready.", `${remaining ? button("Next session", "start", "arrow-right", "", "lime") : ""}${button("Back to overview", "overview", "layout-dashboard", "", "")}`, "circle-check")}</div></div>`;
      return;
    }
    const unit = unitOf(card),
      saved = state.saved.includes(card.id),
      done = session.done.has(card.id),
      outcomes = L.preview(state, card.id);
    $("#main").innerHTML =
      `<div class="feed-shell">${header}<div class="feed-layout"><aside class="session-outline"><span class="eyebrow">IN THIS SESSION</span>${session.ids.map((id, i) => `<div class="outline-item ${i === session.index ? "active" : ""}"><span>${session.done.has(id) ? icon("check") : String(i + 1).padStart(2, "0")}</span>${escape(findCard(id)?.topic || "Card")}</div>`).join("")}</aside>
      <article class="study-card ${unit.color}" id="studyCard" aria-label="${escape(card.topic)} revision card"><div class="card-top"><span class="badge">${escape(unit.name)}</span><span>${String(session.index + 1).padStart(2, "0")} / ${String(session.ids.length).padStart(2, "0")}</span></div><h2>${escape(card.title)}</h2><p class="topic-caption">${escape(card.tag)} &middot; ${escape(status(card))}</p>
      ${!revealed ? `<canvas class="concept-visual" id="conceptCanvas" role="img" aria-label="${escape(visualLabel(card))}"></canvas><div class="question-block"><span class="question-label">THINK IT THROUGH</span><p class="question-text">${escape(card.question)}</p><textarea class="answer-input" id="recallAnswer" aria-label="Your answer" placeholder="Your answer, in a sentence... (optional)" maxlength="2000">${escape(answerDraft)}</textarea><button class="btn reveal-button" data-action="reveal">Reveal answer ${icon("arrow-up-right")}</button></div>` : `<div class="question-block" style="margin-top:24px"><span class="question-label">THE IDEA</span><p class="answer-text">${escape(card.answer)}</p>${card.takeaway ? `<p class="takeaway">${escape(card.takeaway)}</p>` : ""}<p class="self-check">${assessment?.status === "complete" ? `Answer check: ${escape(assessment.verdict)}. Choose your own recall rating below.` : "Compare with your answer. How well did you remember?"}</p>${done ? `<p class="self-check">Reviewed this session. Next review ${escape(status(card).toLowerCase())}.</p>${button("Next card", "next", "arrow-right", "", "reveal-button")}` : `<div class="rating-buttons" aria-label="Rate your recall">${["Again", "Hard", "Good", "Easy"].map((label, i) => `<button data-action="rate" data-rating="${i + 1}">${label}<small>${interval(outcomes[i + 1].card.due)}</small></button>`).join("")}</div>`}</div>`}</article>
      <aside class="feed-actions"><button class="feed-action ${saved ? "selected" : ""}" data-action="save" data-id="${escape(card.id)}" aria-pressed="${saved}"><span>${icon("bookmark")}</span>${saved ? "Saved" : "Save"}</button><button class="feed-action" data-action="detail" data-id="${escape(card.id)}"><span>${icon("book-open")}</span>Go deeper</button><button class="feed-action detail-action" data-action="connections" data-id="${escape(card.id)}"><span>${icon("network")}</span>Connections</button><div class="feed-nav"><button class="icon-button" data-action="previous" aria-label="Previous card" title="Previous card" ${session.index === 0 ? "disabled" : ""}>${icon("arrow-up")}</button><button class="icon-button" data-action="next" aria-label="Skip to next card" title="Skip to next card">${icon("arrow-down")}</button></div></aside></div><div class="session-footer"><span>${session.done.size} of ${session.ids.length} reviewed</span><div class="session-progress"><span style="width:${(session.done.size / session.ids.length) * 100}%"></span></div><span>Active recall</span></div></div>`;
    icons();
    if (!revealed) drawConcept(card);
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
  function drawConcept(card) {
    const canvas = $("#conceptCanvas");
    if (!canvas) return;
    const scale = devicePixelRatio || 1;
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
        card.visual === "custom" ? "Think." : "Revision",
        26,
        114,
        19,
        ink,
        650,
      );
      text(
        card.visual === "custom" ? "Recall." : "Football",
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
      `<div class="detail-heading"><h2>${escape(card.topic)}</h2>${closeButton()}</div><span class="badge ${unitOf(card).color}">${unitOf(card).name}</span><p class="detail-answer">${escape(card.answer)}</p>${!connectionsOnly ? `<div class="detail-section"><h3>Watch the distinction</h3><p>${escape(card.trap)}</p></div><div class="detail-section"><h3>What a strong answer includes</h3><ul class="check-list">${card.rubric.map((point) => `<li>${icon("check")}${escape(point)}</li>`).join("") || "<li>Compare your answer with the reference explanation.</li>"}</ul></div>` : ""}<div class="detail-section"><h3>Connected ideas</h3><div class="related-links">${
        card.related
          .map((id) => findCard(id))
          .filter(Boolean)
          .map(
            (c) =>
              `<button data-action="detail" data-id="${c.id}">${escape(c.topic)}</button>`,
          )
          .join("") || "<p>No linked cards yet.</p>"
      }</div></div><div class="detail-section"><h3>Content provenance</h3><p>${escape(card.source)}. ${card.id.startsWith("custom-") ? "Locally reviewed personal card; not teacher verified." : "Independent sample content; not an official IB question or teacher-verified explanation."}</p></div><div class="dialog-actions">${button("Study this card", "study", "arrow-right", `data-id="${escape(card.id)}"`)}</div>`,
    );
  }
  function renderStudio() {
    const pending = state.submissions.filter(
      (s) => s.status === "pending",
    ).length;
    $("#main").innerHTML =
      `${heading("Card studio", "Build a question worth coming back to.", '<span class="badge">Local workspace</span>')}<div class="studio-tabs" role="tablist" aria-label="Card studio views">${[
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
      `<div class="detail-heading"><h2>Study settings</h2>${closeButton()}</div><form id="settingsForm"><div class="settings-row"><label for="dailyGoal">Daily recall goal<small>A manageable number of checks each day.</small></label><input id="dailyGoal" name="goal" type="number" min="1" max="30" step="1" required value="${state.goal}" /></div><div class="settings-row"><p>Your study data<small>Reviews, saved cards, and personal submissions.</small></p>${button("Export data", "export", "download", 'type="button"', "")}</div><div class="settings-row"><p>Review history<small>Reset scheduling. Keep saved cards and submissions.</small></p><button type="button" class="text-button danger-button" data-action="reset-confirm">Reset reviews</button></div><div class="dialog-actions"><button type="submit" class="btn primary">Save settings ${icon("check")}</button></div></form>`,
    );
  }
  function advance(step) {
    if (!session) return;
    session.index = Math.max(
      0,
      Math.min(session.ids.length, session.index + step),
    );
    revealed = false;
    answerDraft = "";
    assessment = null;
    renderFeed();
    icons();
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
      newSession([id]);
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
        answerDraft = $("#recallAnswer")?.value || answerDraft;
        renderFeed();
        icons();
      } else renderLibraryResults();
      if (persisted)
        toast(
          state.saved.includes(id)
            ? "Added to saved cards"
            : "Removed from saved cards",
        );
    }
    if (action === "reveal" && !revealing) {
      const card = activeCard(),
        currentSession = session,
        currentIndex = session.index;
      answerDraft = $("#recallAnswer")?.value || "";
      revealing = true;
      target.disabled = true;
      const result = await decisions.assessAnswer({
        cardId: card.id,
        cardVersion: card.version,
        question: card.question,
        answer: answerDraft,
        referenceAnswer: card.answer,
        rubric: card.rubric,
      });
      revealing = false;
      if (
        route === "feed" &&
        session === currentSession &&
        session.index === currentIndex
      ) {
        assessment = result;
        revealed = true;
        renderFeed();
        icons();
      }
    }
    if (
      action === "rate" &&
      revealed &&
      activeCard() &&
      !session.done.has(activeCard().id)
    ) {
      const card = activeCard();
      L.rate(state, card.id, Number(target.dataset.rating));
      session.done.add(card.id);
      save();
      advance(1);
      $("#navDue").textContent = L.stats(state, cards()).due;
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
        new Blob([JSON.stringify(state, null, 2)], {
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
    if (event.target.id === "recallAnswer") answerDraft = event.target.value;
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
    if (event.key === "ArrowDown") {
      event.preventDefault();
      advance(1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      advance(-1);
    }
  });
  let touchStart = null;
  document.addEventListener(
    "touchstart",
    (event) => {
      if (
        event.target.closest("#studyCard") &&
        !event.target.closest("textarea,button,input")
      )
        touchStart = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      else touchStart = null;
    },
    { passive: true },
  );
  document.addEventListener(
    "touchend",
    (event) => {
      if (!touchStart || route !== "feed" || $("#modal").open) return;
      const dx = event.changedTouches[0].clientX - touchStart.x,
        dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dy) > 95 && Math.abs(dy) > Math.abs(dx) * 1.5)
        advance(dy < 0 ? 1 : -1);
      touchStart = null;
    },
    { passive: true },
  );
  window.addEventListener("hashchange", () => {
    render();
    window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
  });
  render();
})();
