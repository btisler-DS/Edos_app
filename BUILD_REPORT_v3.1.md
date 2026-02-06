# EDOS Build Report — Version 3.1

**Date:** 2026-02-06
**Status:** Active Development
**Previous:** v3.0 (Phases 3-5 complete), v2.3 (Search & Assembly)

---

## Summary

Version 3.1 adds **local LLM support via Ollama** and resolves a port configuration mismatch. EDOS now supports three concurrent model profiles—cloud API (OpenAI), local fast-response (Qwen 14B), and local deep-thought (Qwen 32B)—each with distinct behavioral modifiers while preserving the shared Edos identity.

---

## What's New Since v3.0

### Port Standardization

The server was running on port 3002 while documentation specified 3001. All references have been unified.

| File | Change |
|------|--------|
| `server/.env` | PORT=3002 → PORT=3001 |
| `client/vite.config.js` | Proxy target → localhost:3001 |
| `start_edos.bat` | All port references → 3001 |
| `USER_GUIDE.md` | All port references → 3001 |

### Ollama Integration (Local LLM)

| Component | Status | Details |
|-----------|--------|---------|
| Ollama v0.15.5 installed | ✅ | `C:\Users\btisl\AppData\Local\Programs\Ollama\ollama.exe` |
| qwen2.5:14b pulled | ✅ | 9.0 GB (Q4_K_M) — fits in 12GB VRAM |
| qwen2.5:32b pulled | ✅ | 19 GB (Q4_K_M) — partial GPU offload, CPU-assisted |
| Ollama server running | ✅ | http://localhost:11434 |

### Model Profiles Configured

| Profile | Provider | Model | Role Modifier |
|---------|----------|-------|---------------|
| GPT-4o | openai | gpt-4-turbo | *(base Edos prompt, unchanged)* |
| EDOS Local (Qwen 2.5 14B) | ollama | qwen2.5:14b | Fast-response: concise, direct answers |
| EDOS Local (Qwen 2.5 32B) | ollama | qwen2.5:32b | Deep-thought: thorough, multi-angle reasoning |

**System prompt structure:** All profiles share the identical base Edos identity prompt. The Qwen profiles append a single behavioral paragraph — no core instructions were modified.

Base prompt (shared):
> You are Edos, a persistent inquiry environment designed for deep thinking and re-entry. Engage thoughtfully with questions. Preserve context across exchanges. Help the user build understanding over time.

14B appended:
> You are running as the fast-response model. Favor concise, direct answers. Get to the point quickly while remaining accurate and helpful.

32B appended:
> You are running as the deep-thought model. Take your time to reason thoroughly. Explore nuance, consider multiple angles, and provide rich, well-developed responses.

### Research Biography Uploaded

Bruce Tisler's research biography (`Bruce_Tisler_research_biography.txt`) uploaded as document context, available for assembly into any session.

---

## Hardware Profile

| Component | Specification |
|-----------|---------------|
| CPU | Intel i5-12600K (16 threads, 3.7 GHz) |
| RAM | 64 GB DDR |
| GPU | NVIDIA RTX 3060 (12 GB VRAM) |
| OS | Windows 10 Pro 64-bit |

### Performance Expectations

| Model | VRAM Usage | Inference Speed | Use Case |
|-------|-----------|-----------------|----------|
| qwen2.5:14b | ~10 GB (full GPU) | ~20+ tokens/sec | Quick questions, daily use |
| qwen2.5:32b | 12 GB GPU + ~8 GB CPU | ~3-8 tokens/sec | Deep analysis, complex reasoning |

---

## Environment Configuration

### Server (.env)

```
ANTHROPIC_API_KEY=configured
OPENAI_API_KEY=configured
PORT=3001
OLLAMA_URL=http://localhost:11434
```

### Running EDOS

```bash
# From root (starts server on 3001, client on 3000)
npm run dev

# Or use the batch file
start_edos.bat
```

### Ollama Commands

```bash
# List installed models
ollama list

# Pull a new model
ollama pull <model_name>

# Check Ollama status
curl http://localhost:11434/api/version
```

---

## Current Profile Inventory

| ID | Name | Provider | Active |
|----|------|----------|--------|
| default-anthropic | GPT-4o | openai | Yes |
| default-ollama | EDOS Local (Qwen 2.5 14B) | ollama | No |
| prof_88572bf5-... | EDOS Local (Qwen 2.5 32B) | ollama | No |

Switch profiles via the Edos UI or API:
```
POST /api/profiles/:id/activate
```

---

## Key Invariants (Unchanged)

| Principle | Status |
|-----------|--------|
| Pull-based context only | ✅ Preserved |
| Explicit assembly | ✅ Preserved |
| No end-of-session chores | ✅ Preserved |
| Stable model identity | ✅ Each profile pinned to specific model + prompt |
| Sessions are user-controlled | ✅ Preserved |
| Base Edos prompt unmodified | ✅ Role modifiers are additive only |

---

## Commits

| Hash | Description |
|------|-------------|
| 0e65370 | Fix server port to 3001 to match documentation |
| *(this report)* | Add Ollama integration, model profiles, research biography |

---

## Known Considerations

1. **32B speed** — Acceptable but noticeably slower due to CPU offload; best suited for deliberate, longer-form inquiries
2. **Ollama startup** — Ollama runs as a background service on Windows; starts automatically on boot
3. **VRAM sharing** — Running both models simultaneously not recommended; switch profiles to unload one before loading another
4. **Biography as context** — Uploaded per-session; use Assembly to attach to new inquiries as needed

---

**End of Build Report**
