# EDOS — Programmer Onboarding (v0.1)

## 1) What EDOS Is (One-Page Brief)

**EDOS** is a **persistent inquiry environment**.
Its purpose is to preserve *continuity of inquiry*—not chats, not notes, not documents.

**Primary problem EDOS solves:**
Re-entry failure after time gaps (days/weeks), especially when inquiry spans multiple conversations, sources, and cognitive modes.

**Non-goals (important):**

* Not a chat wrapper.
* Not a note-taking app.
* Not a knowledge base.
* Not a dashboard with manual admin steps.

**Core principles:**

* Zero administrative ceremony.
* Perceptual re-entry (recognition beats recall).
* Stable AI behavior until the user explicitly changes it.
* Context composition (select N items → new working context).
* Browser-first, portable.

---

## 2) User Constraints (Non-Negotiable)

These are **hard constraints**. If any are violated, EDOS fails for its primary user.

1. **No end-of-session chores**
   No ledgers, no mandatory tagging, no summaries the user must manage.

2. **Stable Model Identity**

   * Model + system prompt are pinned.
   * No silent upgrades.
   * Changing behavior requires explicit action.

3. **Left Panel Is the Index**

   * Titles stay AI-generated.
   * Must support: sorting, similarity grouping, hover/expand micro-context.
   * No new “management pane.”

4. **Re-entry Without Reading**

   * Hover/preview must restore orientation.
   * Opening transcripts is secondary, not required.

5. **Context Assembly Is Native**

   * Multi-select items → open a new context window.
   * Sources remain immutable; new context is derived.

---

## 3) Minimum Viable Build (What to Implement First)

### MVP Scope (Do This First)

1. **Left Panel (Re-entry Surface)**

   * Sort: date / similarity / project lens
   * Hover micro-context (2–3 sentences)
   * Expand/collapse previews (global toggle)
   * Related clusters (“these feel related”)

2. **Context Assembly**

   * Multi-select sessions/items
   * “Open in New Context”
   * New context receives stitched inputs

3. **Model Profile (Pinned)**

   * Provider, exact model ID
   * System prompt (locked)
   * Parameters (locked)
   * Visible indicator of active profile

Everything else waits.

---

## 4) Data Model (Conceptual, Not Prescriptive)

**Item**

* `type`: chat_session | chat_turn | pdf | html | txt | video | transcript_turn
* `content_ref`: pointer to raw content
* `created_at`, `updated_at`
* `source`

**Session**

* AI-generated title (stable)
* Linked Items
* Auto-generated re-entry metadata (see below)
* Model Profile ID

**Context**

* Selection set of Items/Sessions
* Purpose prompt (implicit or explicit)
* Produces a new working thread

**Project (Lens)**

* Saved filter/view
* Non-exclusive
* Zero required filing

---

## 5) Re-entry Metadata (Auto-Captured)

No user action required. Generated continuously/asynchronously.

Each Session should surface:

* **Orientation blurb** (what this was about)
* **Unresolved edge** (why it didn’t close)
* **Last pivot** (where momentum changed)

Displayed as:

* Hover preview
* Expandable inline snippet
* Same content in both states

---

## 6) UI Contract (High-Level)

**Left Panel**

* List items with AI titles
* Hover = show re-entry preview
* Toggle = expand previews inline
* Visual grouping for similarity (subtle; no labels)
* Multi-select (shift-click)

**Main Window**

* Active Context
* Clear lineage (“derived from X, Y, Z”)
* TTS available everywhere

**Always Visible**

* Active Model Profile name/version

---

## 7) Tech Expectations (Flexible, Not Dogmatic)

**Preferred starting posture:**

* Browser-based UI
* Local-first storage acceptable
* GitHub for versioning
* Simple persistence first (SQLite OK)

**Key expectation:**
Architecture must support future:

* multimodal ingestion (PDF, HTML, video transcripts)
* similarity search
* VR/spatial views (as a view transformation, not data migration)

---

## 8) How We Want You (the Programmer) to Engage

This project **expects** and **welcomes** interrogation.

Please come prepared to:

* Question assumptions
* Flag ambiguities
* Propose simplifications
* Identify technical risks early

### Interview Questions We Invite You to Ask

* “What feels underspecified here?”
* “What would you cut from v0?”
* “Where will this break at scale?”
* “What parts should be opinionated vs configurable?”
* “What should never be automated?”

There are no “dumb” questions.
Misunderstandings caught early are wins.

---

## 9) What Success Looks Like (Early)

We will consider EDOS v0 successful when:

* The user can return after weeks and re-enter a line of inquiry **without rereading**.
* Similar conversations are perceptually discoverable.
* Multiple prior contexts can be assembled into a new one in seconds.
* The AI collaborator feels *the same* today as yesterday.

---

## 10) Next Concrete Steps

1. Programmer reviews this onboarding.
2. Programmer interviews the user (you) for clarifying questions.
3. We lock:

   * Left panel behavior
   * Context assembly flow
   * Model Profile mechanics
4. Begin MVP implementation.

---

