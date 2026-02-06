# EDOS User Guide

## Quick Start After Reboot

### Prerequisites
- Node.js installed (v18 or higher recommended)
- npm installed
- API keys configured in `server/.env`

### Manual Startup

1. **Open a terminal** in the EDOS project directory:
   ```
   D:\Claude_Code\project_2\Edos
   ```

2. **Start the server** (runs on port 3001):
   ```bash
   cd server
   set PORT=3001
   npm run dev
   ```

3. **Start the client** (in a new terminal, runs on port 3000):
   ```bash
   cd client
   npm run dev
   ```

4. **Open the app** in your browser:
   ```
   http://localhost:3000
   ```

### One-Click Startup

Use the provided batch file:
```
D:\Claude_Code\project_2\Edos\start_edos.bat
```

Double-click this file to start both the server and client automatically.

---

## Features Overview

### Left Panel - Inquiries

| Button | Function |
|--------|----------|
| **New** | Create a new inquiry session |
| **Upload** | Upload PDF, TXT, MD, or JSON files as context |
| **Assemble** | Multi-select sessions to compose a new inquiry with combined context |
| **Retrieve** | Search archived conversations |
| **Import** | Import OpenAI conversations.json backup |

### Sorting & Filtering

- **Recent / Created** - Sort sessions by last activity or creation date
- **Project Filter** - Filter by assigned project
- **Docs** checkbox - Show only sessions with attached documents

### Retrieve Mode (Search)

Access by clicking the **Retrieve** button. Three search modes available:

1. **Keyword Search**
   - Searches session titles and message content
   - Example: `philosophy`, `machine learning`

2. **Date Search** (Freeform)
   - Supports multiple formats:
     - Year: `2024`
     - Month + Year: `Jan 2024`, `January 2024`, `01/2024`
     - Full date: `01/15/2024` (MM/DD/YYYY) or `15/01/2024` (DD/MM/YYYY)
     - Ranges: `Jan 2024 to Mar 2024`, `2023 to 2024`

3. **Concept Search**
   - Semantic similarity search using embeddings
   - Finds conceptually related sessions even without keyword matches

**Assembling from Search Results:**
- Check multiple results using the checkboxes
- Click "Assemble Context" to create a new inquiry with selected sessions as context

### Main Window

- **Continue this inquiry →** - Create a linked follow-up session
- **Related Inquiries** - Shows semantically similar sessions (collapsed by default)
- **Anchors** - Bookmark important messages within a session
- **Export PDF** - Download session as PDF

### Context Assembly Mode

1. Click **Assemble** in the left panel
2. Check sessions you want to combine
3. Click **Compose New Inquiry** (appears when 2+ selected)
4. A new session is created with context from all selected sessions

---

## Database Information

| Item | Value |
|------|-------|
| Database file | `server/edos.db` |
| Total sessions | 2,315 |
| Date range | January 2023 - Present |

### Searching Tips

- The oldest session is from **January 23, 2023**
- Use date search with `Jan 2023` to find early conversations
- Concept search requires sessions to have embeddings generated

---

## Troubleshooting

### "Request Failed" in Search
- The server may need to be restarted
- Check if server is running: `http://localhost:3001/api/health`
- Restart using the batch file or manual commands

### Server Not Responding
1. Check if port 3001 is in use:
   ```bash
   netstat -ano | findstr ":3001"
   ```
2. Kill the process if needed:
   ```bash
   taskkill /PID <pid_number> /F
   ```
3. Restart the server

### Client Not Loading
1. Check if port 3000 is in use
2. Ensure `npm install` was run in both `/server` and `/client` directories
3. Check browser console for errors

### API Keys
Ensure your `server/.env` file contains:
```
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
PORT=3001
```

---

## File Locations

| Purpose | Path |
|---------|------|
| Project root | `D:\Claude_Code\project_2\Edos` |
| Server | `D:\Claude_Code\project_2\Edos\server` |
| Client | `D:\Claude_Code\project_2\Edos\client` |
| Database | `D:\Claude_Code\project_2\Edos\server\edos.db` |
| Environment config | `D:\Claude_Code\project_2\Edos\server\.env` |
| Startup script | `D:\Claude_Code\project_2\Edos\start_edos.bat` |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message / Execute search |
| `Ctrl+N` | New inquiry (when focused on app) |

---

## Architecture Notes

- **Frontend**: React 18 + Vite (port 3000)
- **Backend**: Express + SQLite (port 3001)
- **Vite proxies** `/api` requests to the backend
- **SSE** (Server-Sent Events) used for streaming responses
