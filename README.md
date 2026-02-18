# 🦐 Krevetka

> **Give your AI a body.** Krevetka is a local bridge between your favourite LLM and your machine — letting AI autonomously build software, run commands, manage files, and search the web, all from a beautiful local UI.

---

## What is Krevetka?

Krevetka is a single Go binary you install on your machine. When you run it, it:

1. Starts a **Next.js UI** at `http://localhost:6009`
2. Connects to your chosen **AI provider** (OpenRouter or LM Studio)
3. Gives the AI **real access to your machine** — terminal, filesystem, web search
4. Lets you **chat with the AI** to build projects, debug code, or automate tasks

The AI comes pre-loaded with a developer persona: it follows conventional commits, asks clarifying questions before big changes, and explains what it's doing before running anything destructive.

---

## Quick Start

```bash
# Install (once released)
brew install krevetka   # macOS
# or download binary from GitHub Releases

# Start Krevetka
krevetka start

# Opens http://localhost:6009 in your browser automatically
```

On first launch, go to **Settings** and:
1. Choose your AI provider (OpenRouter or LM Studio)
2. Enter your API key
3. Select your model
4. Start chatting!

---

## Example: Building a Web App

```
You: Hey, I want to build a todo app in /home/olik/dev/todo-app.
     It should be a Next.js app with a clean dark UI.

Krevetka: Great! Let me ask a few questions first...
          [What color theme would you like?]
          → Slate dark  → Purple dark  → Custom

          [Which database?]
          → SQLite  → PostgreSQL  → None (local state)

          [Authentication?]
          → None  → Email/password  → OAuth (GitHub)

You: Slate dark, SQLite, no auth.

Krevetka: Perfect. Here's my plan: [...]
          Shall I start? → Yes, go for it  → Let me adjust the plan

You: Yes, go for it.

Krevetka: [Creates project structure, installs deps, writes components...]
          [Runs dev server, shows you the result]
          Done! Your app is running at http://localhost:3000 🎉
```

---

## Features

| Feature | Status |
|---|---|
| OpenRouter integration | 🚧 Planned |
| LM Studio integration | 🚧 Planned |
| Terminal access (shell_exec) | 🚧 Planned |
| File read/write/list | 🚧 Planned |
| Web search (Brave API) | 🚧 Planned |
| Interactive project wizard | 🚧 Planned |
| Streaming chat UI | 🚧 Planned |
| Single binary distribution | 🚧 Planned |
| Session history | 🔮 Future |
| Headless browser tool | 🔮 Future |
| Git integration | 🔮 Future |

---

## Architecture

```
krevetka (Go binary)
├── Embedded Next.js UI  →  localhost:6009
├── REST + WebSocket API  →  /api/v1/, /ws
├── LLM Provider Client  →  OpenRouter / LM Studio
└── Tool Executor        →  shell, filesystem, web search
```

The entire app ships as a **single binary** — the Next.js UI is compiled to a static export and embedded directly into the Go binary using `go:embed`. No Node.js required to run it.

---

## Development

### Prerequisites

- Go 1.22+
- Node.js 20+
- npm or pnpm

### Setup

```bash
git clone https://github.com/yourname/krevetka
cd krevetka

# Install UI dependencies
cd ui && npm install && cd ..

# Run in development mode (Go backend + Next.js dev server)
make dev
```

### Build (single binary)

```bash
make build
# Output: ./krevetka
```

### Project Structure

```
krevetka/
├── cmd/krevetka/       # Go entry point
├── internal/
│   ├── api/            # HTTP + WebSocket handlers
│   ├── llm/            # Provider abstraction (OpenRouter, LM Studio)
│   ├── tools/          # AI tool implementations
│   ├── config/         # Config load/save
│   └── prompt/         # System prompt builder
├── ui/                 # Next.js app
├── Makefile
└── PLAN.md             # Detailed technical plan
```

See [PLAN.md](./PLAN.md) for the full technical design.

---

## Configuration

Config is stored at `~/.krevetka/config.json` (created automatically on first run).

```json
{
  "provider": "openrouter",
  "openrouter": {
    "api_key": "sk-or-...",
    "model": "anthropic/claude-3.5-sonnet"
  },
  "ui": {
    "port": 6009,
    "open_browser": true
  }
}
```

---

## Security

- The HTTP server binds to `127.0.0.1` only — **never exposed to the network**
- API keys are stored locally and never logged or transmitted except to your chosen provider
- Shell commands run as your current user (no privilege escalation)
- Destructive operations require explicit confirmation via the UI

---

## Roadmap

See [PLAN.md](./PLAN.md) for the full phased development plan.

---

## License

MIT — do whatever you want with it.

---

*Krevetka means "shrimp" in Russian. 🦐 Small, fast, and surprisingly powerful.*
