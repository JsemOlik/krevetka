# 🦐 Krevetka

An AI coding assistant for the terminal — like Claude Code, but works with **any OpenAI-compatible endpoint**: OpenRouter, LM Studio, Ollama, or any custom API.

## Features

- 🔌 **Any OpenAI-compatible endpoint** — OpenRouter, LM Studio, Ollama, etc.
- 🛠️ **Full tool suite** — read/write files, run shell commands, search, git operations
- 📝 **Conventional commits** — system prompt enforces `feat:`, `fix:`, `chore:` etc.
- 🗺️ **Plan mode** — Q&A session to set project context (tech stack, color scheme, etc.)
- ⚡ **Streaming** — see responses as they're generated
- 🔒 **Shell approval** — prompts `y/N` before running any shell command

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure (copy and edit)
cp .krevetka.example.json .krevetka.json
# Edit .krevetka.json with your API key and model

# Run
pnpm dev
```

## Configuration

Priority order (highest wins):
1. CLI flags (`--model`, `--base-url`, `--api-key`)
2. `.krevetka.json` in current directory
3. `~/.krevetka/config.json` (global)
4. Environment variables (`KREVETKA_API_KEY`, `KREVETKA_BASE_URL`, `KREVETKA_MODEL`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`)

### Provider Examples

**OpenRouter:**
```json
{
  "baseUrl": "https://openrouter.ai/api/v1",
  "apiKey": "sk-or-v1-...",
  "model": "anthropic/claude-3.5-sonnet"
}
```

**LM Studio (local):**
```json
{
  "baseUrl": "http://localhost:1234/v1",
  "apiKey": "lm-studio",
  "model": "qwen2.5-coder-7b-instruct"
}
```

**Ollama (local):**
```json
{
  "baseUrl": "http://localhost:11434/v1",
  "apiKey": "ollama",
  "model": "qwen2.5-coder:7b"
}
```

## CLI Options

```
krevetka [options]

Options:
  -m, --model <model>     Model to use
  -u, --base-url <url>    API base URL
  -k, --api-key <key>     API key
  --max-tokens <n>        Max tokens per response
  --plan                  Run plan mode on startup
  --yolo                  Skip shell command approval (dangerous!)
  --config                Show current configuration and exit
  -V, --version           Show version
  -h, --help              Show help
```

## Slash Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help |
| `/clear` | Clear conversation history |
| `/plan` | Run plan mode (project Q&A) |
| `/config` | Show current configuration |
| `/exit` | Exit Krevetka |

## Tools Available to the AI

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents |
| `write_file` | Write/create files |
| `edit_file` | Targeted string replacement in files |
| `list_directory` | List directory contents |
| `delete_file` | Delete a file |
| `run_shell_command` | Run shell commands (with approval) |
| `git_status` | Show git status |
| `git_diff` | Show git diff |
| `git_add` | Stage files |
| `git_commit` | Create a commit |
| `git_log` | Show commit history |
| `grep_search` | Search with ripgrep/grep |
| `find_files` | Find files by name pattern |

## Build

```bash
pnpm build
node dist/index.js
```

## Install Globally

```bash
pnpm build
npm install -g .
krevetka
```
