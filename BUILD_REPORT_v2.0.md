# EDOS Build Report — Version 2.0

**Date:** 2026-01-24
**Status:** Active Development
**Previous:** v1.0 (Phase 4 complete)

---

## Summary

Version 2.0 marks the transition from **proof of concept** to **living system**. The core EDOS thesis (explicit permission, not memory) is now validated and extended with:

- Longitudinal inquiry continuity (Phase 5)
- Archival ingestion of 2,256 historical conversations (v2 Phase 0)
- Policy files codifying system invariants
- JSON file support for structured context (e.g., user.json)

---

## What's New Since v1.0

### Phase 5: Inquiry Trajectories (Longitudinal Continuity)

| Feature | Status | Files |
|---------|--------|-------|
| inquiry_links table | ✅ | `server/src/db/migrations.js` |
| InquiryLinkService | ✅ | `server/src/services/InquiryLinkService.js` |
| API routes (CRUD) | ✅ | `server/src/routes/inquiryLinks.js` |
| SessionService.create() with continuedFromSessionId | ✅ | `server/src/services/SessionService.js` |
| Client API methods | ✅ | `client/src/services/api.js` |
| Store state for inquiry links | ✅ | `client/src/store/appStore.js` |
| "Continue this inquiry →" button | ✅ | `client/src/components/MainWindow/MainWindow.jsx` |
| Continuation indicator | ✅ | `client/src/components/MainWindow/MainWindow.jsx` |

**Key behavior:** Clicking "Continue this inquiry →" creates a new session structurally linked to the current one. No context is auto-injected. The link is navigational only.

### v2 Phase 0: Archival Ingestion

| Feature | Status | Files |
|---------|--------|-------|
| imported flag on sessions | ✅ | `server/src/db/migrations.js` |
| Import script | ✅ | `server/scripts/import_openai_backup.js` |
| Skip imported sessions in background jobs | ✅ | `server/src/services/SessionService.js` |
| JSON file upload support | ✅ | `server/src/routes/upload.js` |

**Import results:**
- Conversations imported: 2,256
- Messages imported: 41,330
- Empty conversations skipped: 10

**Key behavior:** Imported sessions are "books on a shelf" — discoverable but silent until explicitly engaged. No auto-metadata, no auto-embedding.

### Policy Files

| File | Purpose |
|------|---------|
| `edos_principles.json` | Non-negotiable system invariants |
| `archive_policy.json` | Import and activation rules |
| `user.json` | Reflective user profile (never auto-injected) |
| `v1_to_v2_transition.md` | Epistemic transition record |

---

## Architecture Summary

### Data Flow (Context Assembly)

```
User selects sessions → Assemble mode
         ↓
Compose New Inquiry → POST /api/sessions { contextFromSessions: [...] }
         ↓
SessionService.create() → ContextService.addAssembledContext()
         ↓
session_context table (source_type = 'assembled_sessions')
         ↓
User sends message → ContextService.getFormattedContext()
         ↓
Injected into system prompt → LLM receives context
```

### Data Flow (Inquiry Continuation)

```
User clicks "Continue this inquiry →"
         ↓
POST /api/sessions { continuedFromSessionId: currentId }
         ↓
SessionService.create() → InquiryLinkService.create()
         ↓
inquiry_links table (from_session_id → to_session_id)
         ↓
New session opens with continuation indicator
         ↓
No context injected (structural link only)
```

### Key Invariants

| Principle | Implementation |
|-----------|----------------|
| Pull-based only | No auto-injection of context |
| Explicit assembly | User must select and confirm |
| Inspectable | Context bar shows what's included |
| Reversible | Context applies only to the composed session |
| Structure over personality | Imported content has no inherited voice |

---

## Database Schema (Current)

### Tables

| Table | Purpose |
|-------|---------|
| sessions | Inquiry sessions (+ imported flag) |
| messages | User/assistant/system messages |
| session_metadata | AI-generated orientation metadata |
| session_context | Uploaded documents and assembled context |
| model_profiles | LLM configuration profiles |
| projects | Session organization |
| anchors | User-marked message bookmarks |
| document_chunks | Chunked document content for embeddings |
| embeddings | Vector embeddings for similarity |
| inquiry_links | Explicit session-to-session links |
| lenses | (Reserved for future use) |

### New Columns (v2)

- `sessions.imported` — INTEGER DEFAULT 0 (marks archival imports)

---

## File Changes (Since v1.0)

### Server

| File | Change |
|------|--------|
| `server/src/db/migrations.js` | +inquiry_links, +imported flag |
| `server/src/services/InquiryLinkService.js` | NEW |
| `server/src/routes/inquiryLinks.js` | NEW |
| `server/src/services/SessionService.js` | +continuedFromSessionId, skip imported in metadata |
| `server/src/routes/sessions.js` | Accept continuedFromSessionId |
| `server/src/routes/upload.js` | +JSON file support |
| `server/src/index.js` | Register inquiryLinks router |
| `server/scripts/import_openai_backup.js` | NEW |

### Client

| File | Change |
|------|--------|
| `client/src/services/api.js` | +inquiry link methods |
| `client/src/store/appStore.js` | +inquiryLinks state, +continueInquiry action |
| `client/src/components/MainWindow/MainWindow.jsx` | +Continue button, +continuation indicator |

### Root

| File | Purpose |
|------|---------|
| `edos_principles.json` | System invariants |
| `archive_policy.json` | Import rules |
| `user.json` | User profile |
| `v1_to_v2_transition.md` | Transition record |

---

## Running EDOS

### Startup Sequence

```bash
# Terminal 1: Start API server
cd server
npm run dev
# Runs on http://localhost:3002

# Terminal 2: Start client
cd client
npm run dev
# Runs on http://localhost:3000
```

### Or concurrently from root:

```bash
npm run dev
```

### Import Historical Conversations (one-time)

```bash
node server/scripts/import_openai_backup.js path/to/conversations.json
```

---

## Verification Checklist

### Phase 5 (Inquiry Trajectories)

- [x] "Continue this inquiry →" button appears for sessions with messages
- [x] Clicking creates new session with structural link
- [x] No context auto-injected on continuation
- [x] Continuation indicator shows "↳ Continues from [title]"
- [x] Clicking indicator navigates to parent session
- [x] Cycle detection prevents circular links

### v2 Phase 0 (Archival Ingestion)

- [x] Import script parses OpenAI conversations.json
- [x] System messages excluded
- [x] Imported sessions marked with imported=1
- [x] Background jobs skip imported sessions
- [x] Imported sessions appear in left panel
- [x] JSON file upload works

### Core Principles

- [x] No context injected without explicit user action
- [x] Context bar shows all assembled/uploaded content
- [x] AI remains silent about context it doesn't have
- [x] Personality emerges through interaction, not inheritance

---

## Known Limitations

1. **Imported sessions in left panel** — No filtering toggle yet (all 2,256+ visible)
2. **No semantic search box** — Deferred to future phase
3. **Similar documents panel** — Deferred to future phase
4. **Anchor navigation UI** — Basic implementation only

---

## Commits (v1.0 → v2.0)

```
c29ccc8 Add JSON file support to document upload
70aca14 Add user.json: Reflective user profile for inquiry context
f9baf48 Phase 5 + v2 Phase 0: Longitudinal continuity and archival ingestion
82ac92e Add projects feature for session organization (v1.0)
```

---

## Next Phase Candidates

- Filter toggle: Show/hide imported sessions
- Semantic search across all sessions
- Batch embedding for imported sessions (on-demand)
- Session branching (fork from any point)
- Export assembled context as standalone document

---

## Core Principle (Unchanged)

> "The difference between confusion and coherence is not intelligence — it is permission."

EDOS v2 asks: **What happens when we live inside this principle?**

---

**End of Build Report**
