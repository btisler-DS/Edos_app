# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EDOS is a **persistent inquiry environment** designed to preserve continuity of thinking across time, interruptions, and devices. It solves "re-entry failure"—the cognitive cost of returning to complex work after hours, days, or weeks away.

Key philosophy: Sessions are user-controlled (not time-split), context is regenerated on re-entry (not frozen into summaries), and there is zero administrative ceremony required.

## Development Commands

```bash
# Install all dependencies (root, server, client)
npm run install:all

# Start both server and client concurrently
npm run dev

# Start server only (port 3001, with hot reload)
npm run dev:server

# Start client only (port 3000)
npm run dev:client

# Initialize/reset database
npm run db:init
```

**Client-specific:**
```bash
cd client
npm run build      # Production build
npm run preview    # Preview production build
```

## Architecture

### Tech Stack
- **Frontend:** React 18 + Vite + Zustand (state management)
- **Backend:** Express + better-sqlite3 (synchronous SQLite)
- **LLM Providers:** Anthropic (Claude), OpenAI, and Ollama (local models) via SDKs
- **PDF Export:** Puppeteer (headless Chromium)

### Directory Structure
```
client/src/
├── components/     # React UI components
├── hooks/          # Custom React hooks (useSession, useMessages)
├── services/       # API client (api.js)
└── store/          # Zustand store (appStore.js) - single global store

server/src/
├── config/         # Constants (context limits, thresholds)
├── db/             # SQLite connection, schema, migrations
├── jobs/           # Background jobs (metadata refresh)
├── providers/      # LLM abstraction (AnthropicProvider, OpenAIProvider, OllamaProvider)
├── routes/         # Express route handlers
├── services/       # Business logic (11 services)
└── utils/          # Helpers (ID generation, time, chunking)
```

### Data Flow

1. **Message streaming:** Client sends message → POST `/api/sessions/:id/messages` → SSE stream → Provider's `sendMessageStream()` yields chunks → Client reconstructs response in real-time

2. **Background metadata:** After 60 min inactivity, background job regenerates session metadata (orientation_blurb, unresolved_edge, last_pivot) via utility model

3. **Document upload:** File → text extraction → stored as `session_context` → chunked for embeddings → system message injected into conversation

### Database Schema (SQLite)

Core tables: `sessions`, `messages`, `session_metadata`, `session_context`, `model_profiles`, `projects`, `anchors`, `document_chunks`, `embeddings`

- Sessions cascade-delete messages and metadata
- Only one model profile can be active at a time
- All IDs use prefixed UUIDs (e.g., `ses-`, `msg-`, `prof-`)

### LLM Provider Pattern

```
LLMProvider (base class)
├── AnthropicProvider  (Claude models)
├── OpenAIProvider     (GPT models)
└── OllamaProvider     (Local models via Ollama)
```

Methods: `sendMessageStream()`, `generateMetadata()`, `generateTitle()`

Utility models for metadata: `claude-3-5-haiku-20241022`, `gpt-4o-mini`, or local Ollama model

### Ollama Setup (Local LLM)

Ollama enables running models locally without API costs. Installed at `C:\Users\btisl\AppData\Local\Programs\Ollama\ollama.exe`.

**Installed models:**
- `qwen2.5:14b` (9 GB, Q4_K_M) — fast-response profile, fits in 12GB VRAM
- `qwen2.5:32b` (19 GB, Q4_K_M) — deep-thought profile, partial CPU offload

**Commands:**
```bash
ollama list                  # Show installed models
ollama pull <model>          # Download a model
ollama rm <model>            # Remove a model
curl http://localhost:11434/api/version  # Check Ollama is running
```

**Model profiles in EDOS:**

| Profile | Model | Behavior |
|---------|-------|----------|
| GPT-4o | gpt-4-turbo (cloud) | Base Edos prompt |
| EDOS Local (Qwen 2.5 14B) | qwen2.5:14b | Base prompt + fast-response modifier |
| EDOS Local (Qwen 2.5 32B) | qwen2.5:32b | Base prompt + deep-thought modifier |

All profiles share the same core Edos system prompt. The local profiles append a single behavioral paragraph — the base instructions are never modified.

Switch profiles via UI or API: `POST /api/profiles/:id/activate`

## Non-Negotiable Constraints

These are hard requirements from the design philosophy:

1. **No end-of-session chores** - No mandatory tagging, summaries, or ledgers
2. **Stable model identity** - Model + system prompt are pinned; no silent upgrades
3. **Re-entry without reading** - Hover/preview must restore orientation; opening full transcripts is secondary
4. **Sessions are user-controlled** - Not time-controlled; persist until explicitly closed

## Key Implementation Details

- **Synchronous SQLite:** better-sqlite3 blocks the event loop (acceptable for single-user local app)
- **SSE for streaming:** Server-Sent Events with `data:`, `event: done`, `event: error`, `event: warning`
- **No authentication:** Single-user, local-only design; user_id hardcoded as 'default'
- **Inline styles:** No CSS framework; responsive via media queries (768px breakpoint)
- **Vite proxy:** `/api` routes proxy to backend (check `vite.config.js` for port)

## Environment Variables

Copy `.env.example` to `.env` and configure:
```
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
PORT=3001
OLLAMA_URL=http://localhost:11434
```
