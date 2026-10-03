# Hybrid Econ Platform Implementation Plan

Historical plan, superseded by the 2026-10-03 product rebuild. Do not use the unchecked tasks below as the current backlog. See README.md and docs/JEV_INTEGRATION.md for current capabilities and planned integration work.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished static demo for an IBDP Economics revision platform with dashboard stats and a TikTok-inspired learning feed.

**Architecture:** Keep the app as plain HTML, CSS, and JavaScript. The HTML defines landmarks, CSS owns the visual system, and `app.js` owns topic data, rendering, interactions, quizzes, and local progress.

**Tech Stack:** Static HTML, CSS custom properties, vanilla JavaScript, browser `localStorage`.

---

### Task 1: Documentation

**Files:**
- Create: `AGENTS.md`
- Create: `docs/superpowers/specs/2026-07-06-hybrid-econ-platform-design.md`
- Create: `docs/superpowers/plans/2026-07-06-hybrid-econ-platform.md`

- [ ] Add project purpose, file responsibilities, design rules, and hosting notes.
- [ ] Verify docs avoid stale setup instructions and mention that the project is static.

### Task 2: Dashboard Markup

**Files:**
- Modify: `TikTok Econ.html`

- [ ] Add a dashboard stat grid with IDs for learned lessons, XP, streak, and next topic.
- [ ] Keep existing navigation anchors stable.

### Task 3: Visual System

**Files:**
- Create: `styles.css`

- [ ] Define CSS variables for light and dark themes.
- [ ] Style the topbar, hero, dashboard, unit cards, chapter cards, feed, deep dive, quiz, videos, and responsive layouts.
- [ ] Make the swipe feed visually distinct from the dashboard without making the whole app feel like a social media clone.

### Task 4: App Behavior

**Files:**
- Create: `app.js`

- [ ] Add IBDP Economics topic data.
- [ ] Render units, chapters, swipe cards, mind map nodes, quiz prompts, and video links.
- [ ] Implement progress tracking with `localStorage`.
- [ ] Implement theme toggle and tab behavior.

### Task 5: Verification

**Files:**
- Read: `TikTok Econ.html`
- Read: `styles.css`
- Read: `app.js`

- [ ] Open the HTML file or serve it locally.
- [ ] Confirm there are no missing script/style references.
- [ ] Confirm the dashboard stats update after marking a topic learned.
- [ ] Confirm the feed navigation, tabs, quiz, theme toggle, and reset button work.
