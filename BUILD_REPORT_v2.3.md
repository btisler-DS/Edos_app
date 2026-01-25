# EDOS Build Report — Version 2.3

**Date:** 2026-01-25
**Status:** Active Development
**Previous:** v2.0 (Phase 5 + v2 Phase 0 complete)

---

## Summary

Version 2.3 transforms EDOS from archival storage to **active retrieval system** while maintaining the core invariant: nothing enters an inquiry unless the user explicitly selects it. Three phases complete this transition:

- **Phase 6:** Conversation Control & UI Parity (pin, rename, archive, delete)
- **Phase 7:** Search & Explicit Assembly (keyword, date, concept search with preview-before-commit)
- **Phase 7.1:** Projects as Structural Organization Layer (no auto-assignment)

---

## Search is not memory. Assembly is permission.

The search subsystem follows a strict epistemic boundary:

1. **Search reveals** — Results appear in a separate panel, not in context
2. **Selection is not injection** — Checking a result only marks it for assembly
3. **Assembly requires confirmation** — Preview modal shows exactly what will be included
4. **Context is transparent** — All assembled content visible in context bar
5. **Removal is immediate** — Any context item can be removed with one click

This creates a three-stage workflow: **Discover → Preview → Commit**

---

## What's New Since v2.0

### Phase 6: Conversation Control & UI Parity

| Feature | Status | Files |
|---------|--------|-------|
| pinned, archived, title_locked columns | ✅ | `server/src/db/migrations.js` |
| SessionService.updateFields() | ✅ | `server/src/services/SessionService.js` |
| Archived filter on GET /sessions | ✅ | `server/src/routes/sessions.js` |
| PUT /sessions/:id (title, pinned, archived) | ✅ | `server/src/routes/sessions.js` |
| Pin/unpin, archive/unarchive, rename actions | ✅ | `client/src/store/appStore.js` |
| Pinned-first sorting | ✅ | `client/src/components/LeftPanel/SessionList.jsx` |
| Session action bar (hover) | ✅ | `client/src/components/LeftPanel/SessionItem.jsx` |
| Inline rename input | ✅ | `client/src/components/LeftPanel/SessionItem.jsx` |
| Active/Archived toggle | ✅ | `client/src/components/LeftPanel/LeftPanel.jsx` |

**Key behaviors:**
- Pinned sessions float to top of list
- Imported sessions have `title_locked=1` (rename blocked)
- Archive removes from active view; restore brings it back
- Delete requires confirmation

### Phase 7: Search & Explicit Assembly

| Feature | Status | Files |
|---------|--------|-------|
| SearchService (keyword, date, concept) | ✅ | `server/src/services/SearchService.js` |
| Search routes | ✅ | `server/src/routes/search.js` |
| RetrievePanel with tabs | ✅ | `client/src/components/LeftPanel/RetrievePanel.jsx` |
| Search state in store | ✅ | `client/src/store/appStore.js` |
| AssemblyPreviewModal | ✅ | `client/src/components/AssemblyPreviewModal.jsx` |
| Imported/Native badges | ✅ | RetrievePanel search results |
| Context removal buttons | ✅ | `client/src/components/MainWindow/MainWindow.jsx` |
| DELETE /sessions/:id/context/:contextId | ✅ | `server/src/routes/sessions.js` |
| DELETE /sessions/:id/context | ✅ | `server/src/routes/sessions.js` |
| ContextService.delete() | ✅ | `server/src/services/ContextService.js` |

**Key behaviors:**
- Three search modes: Keyword (LIKE), Date range, Concept (embedding similarity)
- Results show snippet (~240 chars), timestamp, badge (Imported/Native)
- Assembly routes through preview modal before creating session
- Context bar shows item count, per-item remove button, "Clear all"

### Phase 7.1: Projects (Structural Organization Layer)

| Feature | Status | Files |
|---------|--------|-------|
| ProjectService CRUD | ✅ | `server/src/services/ProjectService.js` (pre-existing) |
| Project routes | ✅ | `server/src/routes/projects.js` (pre-existing) |
| No auto-assignment to General | ✅ | `server/src/db/migrations.js`, `SessionService.js` |
| Project-scoped search | ✅ | `server/src/services/SearchService.js` |
| ?projectId= on all search endpoints | ✅ | `server/src/routes/search.js` |
| "(No Project)" filter option | ✅ | `client/src/components/LeftPanel/LeftPanel.jsx` |
| Inline project creation (+) | ✅ | `client/src/components/LeftPanel/LeftPanel.jsx` |
| Project rename/delete controls | ✅ | `client/src/components/LeftPanel/LeftPanel.jsx` |
| "Move" session to project | ✅ | `client/src/components/LeftPanel/SessionItem.jsx` |
| Assembly preview shows project | ✅ | `client/src/components/AssemblyPreviewModal.jsx` |

**Key behaviors:**
- Sessions start with no project (null, not "General")
- Projects are folders, not brains — purely organizational
- Search respects selected project filter
- "Move" dropdown in session action bar
- Assembly preview shows project name per item

---

## Architecture Summary

### Data Flow (Search → Assembly)

```
User enters query → RetrievePanel
         ↓
GET /api/search/{keyword|by-date|concept}
         ↓
Results displayed with checkboxes
         ↓
User selects items → "Assemble" button
         ↓
AssemblyPreviewModal (preview items, token estimate)
         ↓
"Assemble into Inquiry" → POST /api/sessions { contextFromSessions }
         ↓
New session with assembled context
```

### Data Flow (Context Removal)

```
User clicks × on context item
         ↓
DELETE /api/sessions/:id/context/:contextId
         ↓
Context bar updates → item disappears
         ↓
(Or "Clear all" → DELETE /api/sessions/:id/context)
```

### Search Architecture

| Mode | Method | Query Type | Ranking |
|------|--------|------------|---------|
| Keyword | LIKE | Text pattern | By match relevance |
| Date | Range | Timestamp filter | Chronological |
| Concept | Embedding | Semantic similarity | Cosine distance |

All modes support `?projectId=` for scoping.

---

## Database Schema (Current)

### Tables

| Table | Purpose |
|-------|---------|
| sessions | Inquiry sessions (+ pinned, archived, title_locked, imported) |
| messages | User/assistant/system messages |
| session_metadata | AI-generated orientation metadata |
| session_context | Uploaded documents and assembled context |
| model_profiles | LLM configuration profiles |
| projects | Session organization |
| anchors | User-marked message bookmarks |
| document_chunks | Chunked document content for embeddings |
| embeddings | Vector embeddings for similarity |
| inquiry_links | Explicit session-to-session links |

### New Columns (v2.3)

- `sessions.pinned` — INTEGER DEFAULT 0
- `sessions.archived` — INTEGER DEFAULT 0
- `sessions.title_locked` — INTEGER DEFAULT 0 (auto-set for imported)

### Indexes

- `idx_sessions_pinned` — For pinned-first sorting

---

## File Changes (Since v2.0)

### Server

| File | Change |
|------|--------|
| `server/src/db/migrations.js` | +migrateSessionControls(), remove auto-assign orphans |
| `server/src/services/SessionService.js` | +updateFields(), archived filter, create with null project |
| `server/src/services/ContextService.js` | +delete(), +deleteAllForSession() |
| `server/src/services/SearchService.js` | NEW: keyword, date, concept search with project filter |
| `server/src/routes/sessions.js` | Extended PUT, archived filter, context DELETE routes |
| `server/src/routes/search.js` | NEW: /keyword, /by-date, /concept endpoints |
| `server/src/index.js` | Register search router |

### Client

| File | Change |
|------|--------|
| `client/src/services/api.js` | +search methods, +context delete, archived filter |
| `client/src/store/appStore.js` | +pin/archive/rename actions, +search state, +assembly preview |
| `client/src/components/LeftPanel/LeftPanel.jsx` | Active/Archived toggle, project controls |
| `client/src/components/LeftPanel/SessionList.jsx` | Pinned-first sorting |
| `client/src/components/LeftPanel/SessionItem.jsx` | Action bar, inline rename, Move to project |
| `client/src/components/LeftPanel/RetrievePanel.jsx` | NEW: search UI with tabs |
| `client/src/components/MainWindow/MainWindow.jsx` | Context bar with remove buttons |
| `client/src/components/AssemblyPreviewModal.jsx` | NEW: preview-before-commit modal |
| `client/src/App.jsx` | Mount AssemblyPreviewModal |

---

## Verification Checklist

### Phase 6 (Conversation Control)

- [x] Pin a session — appears at top of list
- [x] Unpin — returns to normal position
- [x] Rename a native session — title updates inline
- [x] Attempt rename on imported session — blocked (title_locked)
- [x] Archive a session — disappears from active view
- [x] Switch to archived view — archived session visible
- [x] Unarchive — returns to active view
- [x] Delete with confirmation — session permanently removed

### Phase 7 (Search & Assembly)

- [x] Keyword search returns matching sessions
- [x] Date search filters by range
- [x] Concept search ranks by semantic similarity
- [x] Imported/Native badges appear on results
- [x] Assembly routes through preview modal
- [x] Preview shows item count and token estimate
- [x] Assemble creates new session with context
- [x] Context bar shows × remove button per item
- [x] "Clear all" removes all context

### Phase 7.1 (Projects)

- [x] New sessions have no project (null)
- [x] "(No Project)" filter shows unassigned sessions
- [x] "+" creates project inline
- [x] Rename/Delete project controls appear when selected
- [x] "Move" in session action bar shows project dropdown
- [x] Search respects project filter
- [x] Assembly preview shows project name per item

---

## Key Invariants (Unchanged)

| Principle | Implementation |
|-----------|----------------|
| Pull-based only | No auto-injection of context |
| Explicit assembly | User must select, preview, and confirm |
| Inspectable | Context bar shows what's included |
| Reversible | Any context item can be removed |
| No auto-assignment | Sessions start with no project |
| Search reveals only | Results do not affect active inquiry |

---

## Known Limitations

1. **Embedding quality** — Concept search depends on pre-computed embeddings; imported sessions need manual embedding
2. **Search pagination** — Currently returns up to 25 results per query
3. **Project deletion** — Moves sessions to null (orphans), does not cascade delete sessions

---

## Running EDOS

```bash
# From root
npm run dev

# Or separately:
cd server && npm run dev  # http://localhost:3002
cd client && npm run dev  # http://localhost:3000
```

---

## Core Principle

> "Search is not memory. Assembly is permission."

EDOS v2.3 asks: **What happens when retrieval respects agency?**

---

**End of Build Report**
