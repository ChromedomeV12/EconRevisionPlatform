const topics = [
  {
    id: "negative-externalities",
    unit: "Microeconomics",
    title: "Negative externality",
    short: "A negative externality happens when production or consumption creates costs for third parties.",
    deep: [
      "The market overproduces because private decision makers ignore external costs.",
      "The socially optimal output is lower than the free-market output.",
      "Governments can use indirect taxes, regulation, permits, or education to move output closer to the social optimum."
    ],
    examples: ["Cigarette smoking", "Air pollution from factories", "Traffic congestion"],
    check: "Explain why the market quantity is too high when marginal social cost is greater than marginal private cost.",
    trap: "Do not just say it is bad for society. Show the gap between private and social costs.",
    diagram: "Negative externality of production or consumption diagram with welfare loss.",
    related: ["taxes", "market-failure", "welfare-loss"]
  },
  {
    id: "price-elasticity",
    unit: "Microeconomics",
    title: "Price elasticity of demand",
    short: "PED measures how strongly quantity demanded responds to a change in price.",
    deep: [
      "PED equals percentage change in quantity demanded divided by percentage change in price.",
      "Elastic demand means consumers are responsive, usually because substitutes are available or the good is non-essential.",
      "Firms use PED to predict how price changes affect total revenue."
    ],
    examples: ["Restaurant meals", "Fuel in the short run", "Streaming subscriptions"],
    check: "If price rises by 10% and quantity demanded falls by 25%, calculate PED and interpret it.",
    trap: "Use the absolute value when describing elastic or inelastic demand, but keep the negative sign if your teacher requires it in calculations.",
    diagram: "Demand curve comparison: elastic demand is flatter, inelastic demand is steeper.",
    related: ["demand", "revenue", "substitutes"]
  },
  {
    id: "market-failure",
    unit: "Microeconomics",
    title: "Market failure",
    short: "Market failure occurs when free markets do not allocate resources efficiently.",
    deep: [
      "Efficiency requires marginal social benefit to equal marginal social cost.",
      "Externalities, public goods, common access resources, and asymmetric information can prevent efficient outcomes.",
      "Evaluation should compare government intervention with possible government failure."
    ],
    examples: ["Vaccination underconsumption", "Overfishing", "Polluted rivers"],
    check: "Name two causes of market failure and link each to inefficient resource allocation.",
    trap: "Market failure does not mean the market stops working. It means the outcome is inefficient.",
    diagram: "Depends on cause: externality diagrams, public goods free-rider explanation, or common access resource model.",
    related: ["negative-externalities", "public-goods", "government-intervention"]
  },
  {
    id: "inflation",
    unit: "Macroeconomics",
    title: "Inflation",
    short: "Inflation is a sustained increase in the general price level.",
    deep: [
      "Demand-pull inflation comes from excess aggregate demand.",
      "Cost-push inflation comes from rising production costs.",
      "High inflation can reduce purchasing power, create uncertainty, and damage international competitiveness."
    ],
    examples: ["Energy price shocks", "Post-pandemic demand rebound", "Wage-price spirals"],
    check: "Distinguish demand-pull inflation from cost-push inflation using AD/AS.",
    trap: "A one-off price increase is not the same as sustained inflation.",
    diagram: "AD shift right for demand-pull; SRAS shift left for cost-push.",
    related: ["aggregate-demand", "monetary-policy", "unemployment"]
  },
  {
    id: "exchange-rates",
    unit: "Global Economy",
    title: "Exchange rates",
    short: "An exchange rate is the price of one currency in terms of another.",
    deep: [
      "Floating exchange rates are determined by demand and supply for currencies.",
      "Appreciation can make exports more expensive and imports cheaper.",
      "Depreciation can improve export competitiveness but may increase import costs and inflation."
    ],
    examples: ["Tourism demand", "Interest rate changes", "Export revenue"],
    check: "Explain how higher interest rates can lead to currency appreciation.",
    trap: "Do not confuse appreciation with inflation. They describe different prices.",
    diagram: "Currency demand and supply diagram showing appreciation or depreciation.",
    related: ["exports", "imports", "balance-of-payments"]
  },
  {
    id: "development",
    unit: "Development Economics",
    title: "Economic development",
    short: "Development is broader than economic growth and includes living standards, health, education, and freedom.",
    deep: [
      "GDP growth can support development, but it does not guarantee better distribution, health, or education.",
      "The HDI combines income, education, and life expectancy.",
      "Evaluation should consider sustainability, inequality, institutions, and access to basic services."
    ],
    examples: ["HDI comparisons", "Microfinance", "Infrastructure investment"],
    check: "Explain why GDP per capita alone is an incomplete measure of development.",
    trap: "Growth and development are related, but they are not the same concept.",
    diagram: "Use data comparison or Lorenz curve where inequality is relevant.",
    related: ["growth", "inequality", "hdi"]
  }
];

const units = [
  {
    name: "Microeconomics",
    summary: "Markets, demand and supply, elasticity, market failure, and government intervention."
  },
  {
    name: "Macroeconomics",
    summary: "Economic activity, inflation, unemployment, growth, and demand-side or supply-side policy."
  },
  {
    name: "Global Economy",
    summary: "Trade, protectionism, exchange rates, balance of payments, and economic integration."
  },
  {
    name: "Development Economics",
    summary: "Growth, development, inequality, sustainability, barriers, and intervention strategies."
  }
];

const quizzes = [
  {
    title: "Elasticity",
    question: "If demand is price elastic, what happens to total revenue when price falls?",
    options: ["Total revenue rises", "Total revenue falls", "Total revenue stays the same"],
    answer: 0,
    feedback: "Correct: the percentage rise in quantity demanded is larger than the percentage fall in price."
  },
  {
    title: "Market failure",
    question: "Which situation is most likely to create a negative externality?",
    options: ["A factory pollutes a nearby river", "A student buys a textbook", "A firm lowers prices after costs fall"],
    answer: 0,
    feedback: "Correct: pollution creates costs for third parties outside the market transaction."
  },
  {
    title: "Macroeconomics",
    question: "Cost-push inflation can be shown by which AD/AS change?",
    options: ["SRAS shifts left", "AD shifts right", "LRAS shifts right"],
    answer: 0,
    feedback: "Correct: higher production costs reduce short-run aggregate supply."
  }
];

const videos = [
  {
    title: "Crash Course Economics",
    text: "Fast introductions to core economic ideas.",
    url: "https://www.youtube.com/user/crashcourse"
  },
  {
    title: "Jacob Clifford",
    text: "Clear diagram explanations and exam-style economics revision.",
    url: "https://www.youtube.com/@JacobAClifford"
  },
  {
    title: "EconplusDal",
    text: "IB and A-level economics explanations with evaluation focus.",
    url: "https://www.youtube.com/@EconplusDal"
  }
];

const progressKey = "ibdp-econ-swipe-progress";
let currentUnit = "";
let currentTopic = topics[0];
let currentTab = "short";
let reelIndex = 0;
let quizIndex = 0;
let learned = loadProgress();

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return [...document.querySelectorAll(selector)];
}

function loadProgress() {
  try {
    return new Set(JSON.parse(localStorage.getItem(progressKey)) || []);
  } catch {
    return new Set();
  }
}

function saveProgress() {
  localStorage.setItem(progressKey, JSON.stringify([...learned]));
}

function renderUnits() {
  qs("#unitGrid").innerHTML = units.map((unit) => {
    const unitTopics = topics.filter((topic) => topic.unit === unit.name);
    const done = unitTopics.filter((topic) => learned.has(topic.id)).length;
    return `
      <article class="unit-card">
        <p class="eyebrow">${unit.name}</p>
        <h3>${unit.name}</h3>
        <p>${unit.summary}</p>
        <p><strong>${done}/${unitTopics.length}</strong> topics learned</p>
        <button class="btn primary" onclick="openUnit('${unit.name}')">Open unit</button>
      </article>
    `;
  }).join("");
}

function openUnit(unitName) {
  currentUnit = unitName;
  const unitTopics = topics.filter((topic) => topic.unit === unitName);
  qs("#chapters").classList.remove("hidden");
  qs("#chapterTitle").textContent = unitName;
  qs("#chapterSubtitle").textContent = `${unitTopics.length} revision chapters with short explanations, examples, traps, and checks.`;
  qs("#chapterGrid").innerHTML = unitTopics.map((topic) => `
    <article class="chapter-card">
      <p class="eyebrow">${learned.has(topic.id) ? "Learned" : "Chapter"}</p>
      <h3>${topic.title}</h3>
      <p>${topic.short}</p>
      <button class="btn" onclick="openTopic('${topic.id}')">Study chapter</button>
    </article>
  `).join("");
  qs("#chapters").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openTopic(topicId) {
  currentTopic = topics.find((topic) => topic.id === topicId) || topics[0];
  currentTab = "short";
  qs("#deepDive").classList.remove("hidden");
  qs("#deepUnit").textContent = currentTopic.unit;
  qs("#deepTitle").textContent = currentTopic.title;
  qs("#deepTrap").textContent = currentTopic.trap;
  qs("#deepDiagram").textContent = currentTopic.diagram;
  qs("#promptBox").textContent = `Explain ${currentTopic.title} in 3 sentences: define it, show cause and effect, then give an example.`;
  qs("#relatedTopics").innerHTML = currentTopic.related.map((item) => `<span class="tag">${item}</span>`).join("");
  qsa(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === "short"));
  renderTab();
  updateLearnedButton();
  qs("#deepDive").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeDeepDive() {
  qs("#deepDive").classList.add("hidden");
  if (currentUnit) {
    qs("#chapters").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderTab() {
  const content = {
    short: `<p>${currentTopic.short}</p>`,
    deep: `<ul>${currentTopic.deep.map((point) => `<li>${point}</li>`).join("")}</ul>`,
    examples: `<ul>${currentTopic.examples.map((example) => `<li>${example}</li>`).join("")}</ul>`,
    check: `<p>${currentTopic.check}</p>`
  };
  qs("#tabContent").innerHTML = content[currentTab];
}

function updateLearnedButton() {
  qs("#learnedBtn").textContent = learned.has(currentTopic.id) ? "Learned" : "Mark learned";
}

function markLearned() {
  learned.add(currentTopic.id);
  saveProgress();
  updateStats();
  renderUnits();
  if (currentUnit) openUnit(currentUnit);
  updateLearnedButton();
}

function updateStats() {
  const count = learned.size;
  const total = topics.length;
  const pct = total ? Math.round((count / total) * 100) : 0;
  const next = topics.find((topic) => !learned.has(topic.id));
  qs("#overallPct").textContent = `${pct}%`;
  qs(".progress-ring").style.setProperty("--pct", `${pct}%`);
  qs("#learnedCount").textContent = `${count}/${total}`;
  qs("#xpCount").textContent = String(count * 10);
  qs("#streakCount").textContent = count > 0 ? "1 day" : "0 days";
  qs("#nextTopic").textContent = next ? next.title : "All clear";
}

function renderReel() {
  const topic = topics[reelIndex];
  currentTopic = topic;
  qs("#reelCard").innerHTML = `
    <p class="pill">${topic.unit}</p>
    <h3>${topic.title}</h3>
    <p>${topic.short}</p>
    <div class="reactions">
      <span>${learned.has(topic.id) ? "saved" : "new"}</span>
      <span>+10 XP</span>
      <span>${reelIndex + 1}/${topics.length}</span>
    </div>
    <button class="btn primary" onclick="openTopic('${topic.id}')">Go deeper</button>
  `;
  qs("#heroTopic").textContent = topic.title;
  qs("#heroText").textContent = topic.short;
}

function nextReel(step) {
  reelIndex = (reelIndex + step + topics.length) % topics.length;
  renderReel();
}

function renderMindMap() {
  qs("#mindNodes").innerHTML = topics.map((topic, index) => `
    <button class="mind-node ${index === 0 ? "active" : ""}" onclick="selectMindNode('${topic.id}')">
      ${topic.title}
    </button>
  `).join("");
  selectMindNode(topics[0].id);
}

function selectMindNode(topicId) {
  const topic = topics.find((item) => item.id === topicId) || topics[0];
  qsa(".mind-node").forEach((node) => node.classList.toggle("active", node.textContent.trim() === topic.title));
  qs("#mindTitle").textContent = topic.title;
  qs("#mindText").textContent = `${topic.short} Related ideas: ${topic.related.join(", ")}.`;
}

function renderQuiz() {
  const quiz = quizzes[quizIndex];
  qs("#quizTitle").textContent = quiz.title;
  qs("#quizQuestion").textContent = quiz.question;
  qs("#quizFeedback").textContent = "";
  qs("#quizOptions").innerHTML = quiz.options.map((option, index) => `
    <button onclick="answerQuiz(${index})">${option}</button>
  `).join("");
}

function answerQuiz(index) {
  const quiz = quizzes[quizIndex];
  qsa("#quizOptions button").forEach((button, buttonIndex) => {
    button.disabled = true;
    if (buttonIndex === quiz.answer) button.classList.add("correct");
    if (buttonIndex === index && index !== quiz.answer) button.classList.add("wrong");
  });
  qs("#quizFeedback").textContent = index === quiz.answer ? quiz.feedback : "Close. Check the highlighted answer and try the next one.";
}

function nextQuiz() {
  quizIndex = (quizIndex + 1) % quizzes.length;
  renderQuiz();
}

function renderVideos() {
  qs("#videoGrid").innerHTML = videos.map((video) => `
    <article class="video-card">
      <p class="eyebrow">Video</p>
      <h3>${video.title}</h3>
      <p>${video.text}</p>
      <a class="btn" href="${video.url}" target="_blank" rel="noreferrer">Open YouTube</a>
    </article>
  `).join("");
}

function resetProgress() {
  learned = new Set();
  saveProgress();
  updateStats();
  renderUnits();
  renderReel();
  updateLearnedButton();
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  qs("#themeBtn").textContent = document.body.classList.contains("dark") ? "Light" : "Dark";
}

function bindEvents() {
  qs("#prevCard").addEventListener("click", () => nextReel(-1));
  qs("#nextCard").addEventListener("click", () => nextReel(1));
  qs("#nextQuiz").addEventListener("click", nextQuiz);
  qs("#resetProgress").addEventListener("click", resetProgress);
  qs("#themeBtn").addEventListener("click", toggleTheme);
  qs("#learnedBtn").addEventListener("click", markLearned);
  qsa(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      currentTab = button.dataset.tab;
      qsa(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      renderTab();
    });
  });
}

function init() {
  renderUnits();
  renderReel();
  renderMindMap();
  renderQuiz();
  renderVideos();
  updateStats();
  bindEvents();
}

init();
