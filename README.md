# EDOS — Persistent Inquiry Environment

**EDOS** is a local-first, browser-based inquiry environment designed to preserve *continuity of thinking* across time, interruptions, and devices.

Unlike traditional chat tools or note apps, EDOS treats inquiry as a **living process**, not a sequence of isolated exchanges. Sessions persist until the user explicitly closes them. Context is regenerated on re-entry rather than frozen into summaries or logs.

This repository contains the current **working prototype**.

---

## Installation

### Requirements

**Minimum Hardware:**
- CPU: Any modern dual-core processor (2015 or later)
- RAM: 4 GB (8 GB recommended)
- Storage: 500 MB free space (plus space for your database)
- Display: 1280x720 minimum resolution

**Software:**
- Node.js 18.x or higher
- npm 9.x or higher
- A modern browser (Chrome, Firefox, Edge, Safari)
- API key from Anthropic and/or OpenAI

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/brucetisler/Edos.git
   cd Edos
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API keys:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3001
   ```

4. **Create your user profile** (optional but recommended)
   ```bash
   cp user.json.template user.json
   ```
   Edit `user.json` with your personal information. The `personal_information` section should be customized with your details. The remaining sections describe inquiry style and preferences — modify them to reflect how you think and work, or keep the defaults.

5. **Initialize the database**
   ```bash
   npm run db:init
   ```

6. **Start EDOS**
   ```bash
   npm run dev
   ```

   The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Accessing from Other Devices

To access EDOS from other devices on your local network (phone, tablet):

1. Find your computer's local IP address
2. Access `http://<your-local-ip>:3000` from your device

---

## Core Concept

Modern tools preserve *data*, but they fail to preserve *orientation*.

EDOS is designed to solve **re-entry failure** — the cognitive cost of returning to complex work after hours, days, or weeks away.

It does this by combining:

* Persistent inquiry sessions (not time-split chats)
* AI-generated titles and re-entry metadata
* Hover-based previews instead of forced summaries
* Local storage and user-controlled models
* Zero required administrative overhead

---

## Current Status

**Phase:** Early MVP (Phase 1b complete)
**Scope:** Single-user, local-only
**Deployment:** Local development server

Implemented features include:

* Persistent inquiry sessions
* AI-generated session titles
* Hover previews with re-entry context
* Background metadata regeneration after inactivity
* PDF export of full inquiry sessions
* Document upload with inline integration into conversation history
* Stable model identity (“Edos”) unless explicitly changed
* Local-first architecture (no cloud dependency)

---

## What EDOS Is *Not*

* Not a note-taking app
* Not a chat wrapper
* Not a task manager
* Not a knowledge base

EDOS does **not** require:

* Manual tagging
* Forced summaries
* Session closing rituals
* Organizational bookkeeping

If a feature adds administrative friction, it is intentionally avoided.

---

## Architecture Overview

**Frontend**

* Browser-based UI
* Responsive layout (desktop, tablet, mobile)
* Left inquiry panel + main inquiry workspace
* PDF export from UI

**Backend**

* Local server
* Session storage in SQLite
* Background metadata generation
* HTML → PDF rendering (Puppeteer)

**Models**

* User-supplied API keys
* Model selection is explicit and pinned
* Identity and system prompt are stable unless changed

---

## Document Handling Model

Uploaded documents are treated as **part of the inquiry**, not as separate artifacts.

* Document text is extracted
* The document is inserted into the session timeline as a system event
* The content becomes available for inquiry immediately
* Documents do *not* create separate sessions
* Documents are included in PDF exports as part of the conversation

This prevents fragmentation when multiple documents are used across multiple inquiries.

---

## Local Network Access

The dev server can be bound to `0.0.0.0` to allow access from other devices on the same network (e.g. iPad or phone):

```
http://<local-ip>:3001
```

This is supported for viewing and interaction during development.

---

## Project Philosophy (Important)

EDOS is built around several non-negotiable principles:

* **Sessions are user-controlled**, not time-controlled
* **Re-entry context is regenerated**, not frozen
* **Continuity > compression**
* **Inquiry before organization**
* **Stability over cleverness**

Features are evaluated based on whether they *reduce cognitive friction* — not whether they add power.

---

## Roadmap (High-Level)

Planned next steps include:

* Project grouping (multiple inquiries under a shared context)
* Configurable model profiles (system prompt, parameters)
* Inquiry lenses (purpose-specific GPT behaviors)
* Similarity grouping across sessions
* Cold re-entry testing across devices
* Optional embeddings for semantic clustering

No cloud sync or multi-user support is planned for the near term.

---

## Contribution Notes

This project is **intentionally opinionated**.

If you are contributing:

* Favor clarity over abstraction
* Avoid adding administrative workflows
* Assume the user is returning after time has passed
* Treat interruption as the default condition

Questions, confusion, and critique are welcome — especially around UX, re-entry behavior, and cognitive load.

---

## License

License to be determined.
This prototype is not currently released for commercial use.

