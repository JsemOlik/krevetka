# Krevetka — Project Plan

> **Krevetka** is an AI-to-machine bridge: a Go binary that gives your chosen LLM full access to your local machine (terminal, filesystem, browser, internet), controlled through a Next.js UI running at `localhost:6009`.

---

## 1. Vision & Goals

| Goal | Description |
|---|---|
| **AI-native dev assistant** | Give LLMs real, persistent access to a developer's machine so they can autonomously build software end-to-end |
| **Provider-agnostic** | Support OpenRouter and LM Studio out of the box; easily extensible to others |
| **Interactive project setup** | Guide users through project creation with a conversational, button-driven UI |
| **Autonomous execution** | AI can run terminal commands, read/write files, search the web, and ask the user for input when needed |
| **Conventional workflow** | AI is pre-prompted to follow conventional commits, clean code standards, and modern web dev best practices |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     User's Machine                       │
│                                                         │
│  ┌──────────────┐        ┌──────────────────────────┐  │
│  │  krevetka    │◄──────►│   Next.js UI             │  │
│  │  (Go binary) │  HTTP  │   localhost:6009          │  │
│  │              │  WS    │                          │  │
│  └──────┬───────┘        └──────────────────────────┘  │
│         │                                               │
│         │  Tool calls (shell, fs, http)                 │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │  Local OS    │  (terminal, filesystem, browser)      │
│  └──────────────┘                                       │
│         │                                               │
│         │  LLM API calls                                │
│         ▼                                               │
│  ┌──────────────────────┐                               │
│  │  AI Provider         │                               │
│  │  OpenRouter / LM     │                               │
│  │  Studio              │                               │
│  └──────────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

**Communication flow:**
1. User opens `localhost:6009` in browser
2. Next.js UI communicates with the Go binary via a local REST + WebSocket API
3. Go binary sends messages to the LLM provider (OpenRouter / LM Studio)
4. LLM responds with tool calls (run command, read file, write file, search web, etc.)
5. Go binary executes tool calls on the local machine and streams results back to the UI

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Binary / Backend** | Go | Single binary, fast startup, great for process management and OS interaction |
| **UI** | Next.js 14 (App Router) | Modern React, SSR, easy WebSocket support |
| **Styling** | Tailwind CSS + shadcn/ui | Fast, beautiful, accessible components |
| **IPC** | REST + WebSocket (gorilla/websocket) | Simple, well-supported, real-time streaming |
| **Config storage** | Local JSON file (`~/.krevetka/config.json`) | No database needed for MVP |
| **LLM protocol** | OpenAI-compatible Chat Completions API | Both OpenRouter and LM Studio support this |

---

## 4. Repository Structure

```
krevetka/
├── cmd/
│   └── krevetka/
│       └── main.go              # Entry point: starts HTTP server + serves UI
├── internal/
│   ├── api/                     # REST + WebSocket handlers
│   │   ├── routes.go
│   │   ├── chat.go              # Chat endpoint, streams LLM responses
│   │   ├── config.go            # Config read/write endpoints
│   │   └── ws.go                # WebSocket hub
│   ├── llm/                     # LLM provider abstraction
│   │   ├── provider.go          # Interface: Provider
│   │   ├── openrouter.go        # OpenRouter implementation
│   │   └── lmstudio.go          # LM Studio implementation
│   ├── tools/                   # AI tool implementations
│   │   ├── registry.go          # Tool registry
│   │   ├── shell.go             # Run shell commands
│   │   ├── filesystem.go        # Read/write/list files
│   │   ├── search.go            # Web search (via SerpAPI or Brave)
│   │   └── browser.go           # (Future) headless browser control
│   ├── config/
│   │   └── config.go            # Load/save ~/.krevetka/config.json
│   └── prompt/
│       └── system.go            # System prompt builder
├── ui/                          # Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Main chat interface
│   │   ├── settings/
│   │   │   └── page.tsx         # Provider + API key + model selection
│   │   └── project/
│   │       └── page.tsx         # New project wizard
│   ├── components/
│   │   ├── ChatWindow.tsx       # Scrollable message history
│   │   ├── MessageBubble.tsx    # User / AI message rendering
│   │   ├── ToolCallCard.tsx     # Shows tool calls + results inline
│   │   ├── InteractivePrompt.tsx # AI-driven buttons/choices for user
│   │   ├── SettingsForm.tsx
│   │   └── ProjectWizard.tsx
│   ├── lib/
│   │   ├── api.ts               # Typed API client
│   │   └── ws.ts                # WebSocket client hook
│   ├── package.json
│   └── next.config.ts
├── scripts/
│   └── build.sh                 # Builds Go binary + Next.js, embeds UI
├── Makefile
├── go.mod
├── go.sum
├── PLAN.md
└── README.md
```

---

## 5. Go Binary — Detailed Design

### 5.1 Startup Sequence

```
krevetka start
  1. Load config from ~/.krevetka/config.json
  2. Embed Next.js build (go:embed ui/out/**)
  3. Start HTTP server on :6009
     - Serve embedded Next.js static files at /
     - Mount REST API at /api/v1/
     - Mount WebSocket at /ws
  4. Open browser to http://localhost:6009 (optional flag: --no-browser)
  5. Block until SIGINT/SIGTERM
```

### 5.2 LLM Provider Interface

```go
type Provider interface {
    Name() string
    ListModels(ctx context.Context) ([]Model, error)
    Chat(ctx context.Context, req ChatRequest) (<-chan ChatChunk, error)
}
```

Both OpenRouter and LM Studio implement this interface via the OpenAI-compatible API. The only differences are the base URL and auth header.

### 5.3 Tool System

Tools follow the OpenAI function-calling schema. The Go binary:
1. Sends tool definitions to the LLM in the system message
2. Receives tool call requests from the LLM
3. Executes the tool locally
4. Sends tool results back to the LLM
5. Streams the final response to the UI

**Initial tool set:**

| Tool | Description |
|---|---|
| `shell_exec` | Run a shell command, stream stdout/stderr |
| `file_read` | Read a file's contents |
| `file_write` | Write/overwrite a file |
| `file_list` | List directory contents |
| `file_delete` | Delete a file or directory |
| `web_search` | Search the web via [Exa MCP](https://mcp.exa.ai/mcp) (no API key required) |
| `ask_user` | Pause and ask the user a question with optional button choices |

### 5.4 System Prompt

The system prompt is injected automatically on every session start. It tells the AI:
- It is a senior software/web developer assistant
- It should use conventional commits (`feat:`, `fix:`, `chore:`, etc.)
- It should ask clarifying questions before starting large tasks
- It should prefer modern, well-maintained libraries
- It should explain what it's doing before running destructive commands
- It has access to a set of tools (listed with descriptions)

The prompt is templated and includes the current date, OS, working directory, and configured project context.

---

## 6. Next.js UI — Detailed Design

### 6.1 Pages

| Route | Purpose |
|---|---|
| `/` | Main chat interface with the AI |
| `/settings` | Configure provider, API key, model |
| `/project/new` | New project wizard (interactive Q&A) |

### 6.2 Chat Interface

- Real-time streaming via WebSocket
- Messages rendered as Markdown (with syntax highlighting via `shiki`)
- Tool calls shown as collapsible cards with status (running / done / error)
- `ask_user` tool triggers interactive UI elements (buttons, text inputs) inline in the chat
- Terminal output streamed in a code block with a scrollable view

### 6.3 Settings Page

- Select provider: OpenRouter | LM Studio
- Enter API key (stored in `~/.krevetka/config.json`, never sent to UI in plaintext after save)
- Fetch and display available models from the provider
- Select default model
- Optional: set working directory, web search API key

### 6.4 Project Wizard

When the user says "I want to build X", the AI uses the `ask_user` tool to collect:
1. Project name & target directory
2. Project description / goals
3. Tech stack preferences (e.g., Next.js, Vite, SvelteKit…)
4. Color theme / design style
5. Any specific features or integrations

After collecting answers, the AI generates a project plan, confirms with the user, then begins building autonomously.

---

## 7. Configuration File

**Location:** `~/.krevetka/config.json`

```json
{
  "provider": "openrouter",
  "openrouter": {
    "api_key": "sk-or-...",
    "model": "anthropic/claude-3.5-sonnet"
  },
  "lmstudio": {
    "base_url": "http://localhost:1234",
    "model": "llama-3.1-8b-instruct"
  },
  "web_search": {
    "provider": "exa",
    "mcp_url": "https://mcp.exa.ai/mcp"
  },
  "ui": {
    "port": 6009,
    "open_browser": true
  }
}
```

---

## 8. Build & Distribution

### 8.1 Build Process

```bash
# 1. Build Next.js (static export)
cd ui && npm run build

# 2. Build Go binary with embedded UI
go build -o krevetka ./cmd/krevetka

# 3. (Optional) Cross-compile
GOOS=linux GOARCH=amd64 go build -o krevetka-linux-amd64 ./cmd/krevetka
GOOS=darwin GOARCH=arm64 go build -o krevetka-darwin-arm64 ./cmd/krevetka
GOOS=windows GOARCH=amd64 go build -o krevetka-windows-amd64.exe ./cmd/krevetka
```

The Next.js app is exported as a static site (`next export`) and embedded into the Go binary using `//go:embed`. This means the final distributable is a **single binary** with no external dependencies.

### 8.2 Makefile Targets

```makefile
make dev       # Run Go backend + Next.js dev server concurrently
make build     # Full production build (single binary)
make clean     # Remove build artifacts
make release   # Cross-compile for all platforms
```

---

## 9. Development Phases

### Phase 1 — Foundation (MVP)
- [ ] Initialize Go module and project structure
- [ ] Initialize Next.js app in `ui/`
- [ ] Go HTTP server with static file serving + basic REST API
- [ ] Config load/save (`~/.krevetka/config.json`)
- [ ] Settings UI: provider selection, API key, model picker
- [ ] Basic chat UI with WebSocket streaming
- [ ] LLM integration: OpenRouter + LM Studio (OpenAI-compatible)
- [ ] System prompt injection

### Phase 2 — Tool System
- [ ] Tool registry in Go
- [ ] `shell_exec` tool (stream stdout/stderr to UI)
- [ ] `file_read`, `file_write`, `file_list`, `file_delete` tools
- [ ] `ask_user` tool (renders interactive UI elements in chat)
- [ ] Tool call cards in the UI (collapsible, status indicators)

### Phase 3 — Project Wizard
- [ ] `/project/new` page
- [ ] AI-driven Q&A flow using `ask_user`
- [ ] Project plan generation and confirmation step
- [ ] Autonomous build loop with user intervention points

### Phase 4 — Web Search & Polish
- [ ] `web_search` tool via Exa MCP server (no API key required)
- [ ] Markdown rendering with syntax highlighting
- [ ] Terminal output streaming view
- [ ] Session history (save/load conversations)
- [ ] Single binary build with embedded UI

### Phase 5 — Future / Stretch Goals
- [ ] Headless browser tool (Playwright via subprocess)
- [ ] Git integration (commit, diff, branch management)
- [ ] Multiple concurrent sessions / projects
- [ ] Plugin system for custom tools
- [ ] Auto-update mechanism

---

## 10. Security Considerations

- API keys are stored locally in `~/.krevetka/config.json` (chmod 600)
- The HTTP server binds to `127.0.0.1` only — never exposed to the network
- Shell commands run as the current user (no privilege escalation)
- Destructive operations (file delete, rm -rf, etc.) should be confirmed via `ask_user` before execution
- No telemetry or data sent anywhere except the configured LLM provider

---

## 11. Key Dependencies

### Go
| Package | Purpose |
|---|---|
| `github.com/gorilla/websocket` | WebSocket server |
| `github.com/gin-gonic/gin` | HTTP router |
| `github.com/sashabaranov/go-openai` | OpenAI-compatible client |
| `github.com/spf13/cobra` | CLI commands |
| `github.com/spf13/viper` | Config management |

### Next.js / Node
| Package | Purpose |
|---|---|
| `next` | Framework |
| `tailwindcss` | Styling |
| `shadcn/ui` | Component library |
| `react-markdown` | Markdown rendering |
| `shiki` | Syntax highlighting |
| `zustand` | State management |
