# EDOS Buildout Plan

*From chat app to intellectual infrastructure*

---

## Your Hardware Baseline

- **CPU**: i5-12600K (16 threads @ 3.7GHz) — can serve requests + run local models
- **RAM**: 64GB — ample for large contexts, embeddings in memory, multiple services
- **GPU**: RTX 3060 (12GB VRAM) — runs 7B-13B parameter models, local embeddings
- **Capacity**: Can operate as always-on personal server

---

## Phase 1: Foundation Hardening (Week 1-2)

*Fix what's fragile before building higher.*

### 1.1 Store Refactor
- Split `appStore.js` (703 lines) into domain slices:
  - `sessionStore.js` — sessions, messages, anchors
  - `searchStore.js` — retrieve mode, search results, selections
  - `assemblyStore.js` — context assembly, preview
  - `uiStore.js` — panels, modals, loading states
- Extract common patterns (error handling, loading states) into shared utilities

### 1.2 Styling System
- Extract inline styles to CSS modules or a minimal theme system
- Create `theme.js` with color tokens: `--bg-primary`, `--accent`, `--text-muted`
- Single source of truth for the dark palette
- Enables future: light mode, custom themes, accessibility

### 1.3 Error Handling
- Create structured error types: `ApiError`, `ProviderError`, `ValidationError`
- Consistent error boundaries in React
- User-facing error messages separate from technical logs
- Retry logic for transient failures (embedding generation, metadata refresh)

### 1.4 Input Validation
- Add `zod` or `joi` schemas for API routes
- Sanitize user input before LLM injection
- Request size limits (prevent context bomb attacks)
- Rate limiting per session (soft limits, warn before block)

### 1.5 Request Lifecycle
- Add AbortController support to streaming requests
- Clean up SSE connections on navigation
- Rollback optimistic updates on error
- Replace temp IDs with proper UUID generation client-side

---

## Phase 2: Remote Access (Week 2-3)

*Access your thinking from anywhere.*

### 2.1 Authentication Layer
- Add JWT-based auth (single user, but secure)
- Login page with password hash (bcrypt)
- Session tokens with configurable expiry
- Middleware to protect all `/api` routes

### 2.2 HTTPS & Exposure Options

**Option A: Tailscale (Recommended for personal use)**
- Zero-config VPN, encrypted tunnel
- Access via `https://desktop-6ajm9t5.tailnet-name.ts.net:3001`
- No port forwarding, no dynamic DNS
- Works on mobile (Tailscale app)

**Option B: Cloudflare Tunnel**
- Free, no exposed ports
- Custom domain support (e.g., `edos.yourdomain.com`)
- Cloudflare Access for additional auth layer

**Option C: VPS Reverse Proxy**
- Cheap VPS ($5/mo) running nginx
- WireGuard tunnel back to your machine
- Full control, custom domain, SSL via Let's Encrypt

### 2.3 Mobile-Responsive UI
- Refine 768px breakpoint for true mobile use
- Collapsible panels (left panel becomes drawer)
- Touch-friendly tap targets (44px minimum)
- Swipe gestures for navigation
- PWA manifest for home screen install

### 2.4 Offline Resilience
- Service worker for static assets
- Queue messages when offline, sync when reconnected
- Local draft storage (IndexedDB)
- Graceful degradation when server unreachable

---

## Phase 3: Local AI Integration (Week 3-4)

*Reduce API dependency, increase privacy, lower costs.*

### 3.1 Ollama Provider
- New provider class: `OllamaProvider extends LLMProvider`
- Support for local models: Llama 3, Mistral, Phi-3, Qwen
- Your RTX 3060 can run:
  - 7B models at full speed (~30 tokens/sec)
  - 13B models comfortably (~15 tokens/sec)
  - 30B+ quantized (Q4) with acceptable speed

### 3.2 Local Embeddings
- Replace OpenAI embeddings with local alternatives:
  - `nomic-embed-text` via Ollama (768 dims, fast)
  - `all-MiniLM-L6-v2` via Hugging Face (384 dims, very fast)
- Run on CPU (your 64GB RAM handles it easily)
- Zero API cost for semantic search

### 3.3 Hybrid Model Strategy
- Use local models for:
  - Quick questions, drafts, brainstorming
  - Metadata generation (title, orientation blurb)
  - Embedding generation
- Use cloud models (Claude, GPT-4) for:
  - Complex reasoning, long context
  - When you need the "best" response
- Profile-based selection: user chooses per session

### 3.4 Model Profile Enhancement
- Add `provider_config` field for connection details
- Support multiple Ollama endpoints (if you add another machine)
- Model-specific parameters (context length, GPU layers)
- A/B testing: same prompt, different models, compare

---

## Phase 4: Proactive Intelligence (Week 4-6)

*The system anticipates, not just responds.*

### 4.1 Automatic Context Surfacing
- When composing a message, search embeddings in background
- Surface: "You explored something related 3 months ago"
- Show as subtle suggestion, not intrusive modal
- Click to inject as context or navigate to old session

### 4.2 Cross-Session Synthesis
- New endpoint: `POST /api/synthesize`
- Input: query + optional session filter
- Output: synthesized answer drawing from all relevant sessions
- "Summarize my thinking on X across all time"

### 4.3 Unresolved Edge Tracking
- Dashboard view of all sessions with unresolved_edge
- "Open questions across your inquiries"
- Periodic prompt: "You left this unresolved 2 weeks ago"
- Mark as resolved, or continue inquiry

### 4.4 Temporal Patterns
- "What were you thinking about in Q3 2025?"
- Heat map of inquiry activity
- Topic clustering over time
- Detect recurring themes you return to

### 4.5 Inquiry Graph Visualization
- D3.js or similar: nodes = sessions, edges = inquiry_links + semantic similarity
- Visual map of your intellectual territory
- Click to navigate, hover for preview
- Filter by project, date range, topic cluster

---

## Phase 5: Data Sovereignty (Week 6-7)

*Your thinking, your control, forever.*

### 5.1 Export Formats
- Full export: SQLite database + all embeddings
- Portable export: JSON with sessions, messages, metadata, links
- Markdown export: each session as `.md` file with YAML frontmatter
- PDF book: compile project or date range into printable document

### 5.2 Backup & Sync
- Scheduled SQLite backup (daily, to Dropbox/OneDrive)
- WAL checkpoint before backup (ensure consistency)
- Encrypted backup option (age encryption, passphrase)
- Restore from backup with conflict resolution

### 5.3 Import Expansion
- Import from ChatGPT (already have this)
- Import from Claude.ai conversation exports
- Import from Notion, Obsidian, Roam (markdown-based)
- Import from voice memos (Whisper transcription → session)

### 5.4 Multi-Device Sync (Advanced)
- CRDTs or operational transforms for conflict-free sync
- Phone creates session → syncs to desktop → continues seamlessly
- SQLite replication (Litestream to S3, or custom sync)

---

## Phase 6: Compound Intelligence (Week 7-8)

*The system becomes smarter because you've used it.*

### 6.1 Personal Knowledge Graph
- Extract entities from sessions (people, concepts, projects)
- Build relationships: "discussed X in context of Y"
- Query: "What do I know about [concept]?"
- Graph database layer (SQLite + JSON, or embedded Neo4j)

### 6.2 Thinking Patterns
- Analyze your inquiry style over time
- "You often ask about X before deciding on Y"
- "Your unresolved edges cluster around Z"
- Optional weekly digest: "Your intellectual week"

### 6.3 Model Memory Injection
- When starting session, inject compressed summary of:
  - This project's key decisions
  - Your stated preferences and principles
  - Relevant past conclusions
- Model "remembers" without full transcript replay

### 6.4 Collaborative Features (Optional)
- Share read-only session via link
- Collaborative sessions (multiple users, same thread)
- Team knowledge base (shared projects, shared embeddings)
- Permission model: owner, editor, viewer

---

## Technical Debt Paydown (Ongoing)

These should happen incrementally throughout:

| Item | Phase to Address |
|------|------------------|
| Add test coverage (Jest + React Testing Library) | Phase 1 |
| TypeScript migration (gradual, start with services) | Phase 2 |
| API client abstraction (interceptors, retry logic) | Phase 1 |
| Background job persistence (survive restarts) | Phase 3 |
| Structured logging (pino or winston) | Phase 1 |
| Health monitoring (uptime, error rates) | Phase 2 |
| Database migrations versioning | Phase 1 |

---

## Deployment Architecture (Target State)

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR MACHINE                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Edos      │  │   Ollama    │  │   SQLite + WAL      │  │
│  │   Server    │◄─┤   (Local    │  │   (Persistent       │  │
│  │   :3001     │  │   Models)   │  │   Storage)          │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                   │
│  ┌──────▼──────┐                                           │
│  │  Tailscale  │                                           │
│  │  (Encrypted │                                           │
│  │   Tunnel)   │                                           │
│  └──────┬──────┘                                           │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Phone / Tablet    │     │   Laptop / Other    │
│   (Tailscale App)   │     │   (Tailscale App)   │
│   Browser → Edos    │     │   Browser → Edos    │
└─────────────────────┘     └─────────────────────┘
```

---

## Priority Order (If Time-Constrained)

If you can only do some of this, prioritize in this order:

1. **Remote Access (Phase 2.1-2.2)** — Tailscale setup, basic auth
2. **Mobile UI (Phase 2.3)** — Usable from phone
3. **Local Embeddings (Phase 3.2)** — Remove OpenAI dependency for search
4. **Ollama Provider (Phase 3.1)** — Local model option
5. **Proactive Surfacing (Phase 4.1)** — The "aha" feature
6. **Everything else** — As time permits

---

## Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 | 15-20 hours | None |
| Phase 2 | 20-25 hours | Phase 1 (auth) |
| Phase 3 | 15-20 hours | Ollama installed |
| Phase 4 | 25-30 hours | Phase 3 (local speed) |
| Phase 5 | 15-20 hours | None |
| Phase 6 | 30-40 hours | Phases 1-4 |

Total: ~120-155 hours for full buildout

---

## Next Immediate Steps

1. Install Tailscale on this machine + your phone
2. Test Edos access via Tailscale hostname
3. Add basic password auth to `/api` routes
4. Install Ollama, pull `llama3:8b` or `mistral:7b`
5. Create `OllamaProvider.js` following existing provider pattern

Ready to start with any of these?
