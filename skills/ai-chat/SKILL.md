---
name: ai-chat
description: AI chat sessions with SSE streaming, URL auto-detection & fetching, and prompt templates
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **AI Chat** feature — session-based conversations with streaming LLM responses
- Create or modify chat components in `src/components/chat/` and `src/pages/chat/`
- Manage the SSE streaming architecture (frontend fetches LLM directly, no Rust proxy)
- Handle URL auto-detection, fetching HTML content, and injecting it as system context
- Manage chat sessions, messages with pagination, prompt templates, and AI providers

## When to use me
Use when working on the AI Chat module — adding chat features, modifying streaming logic, changing URL detection/fetching, working on prompt templates, managing AI provider CRUD, or fixing message pagination. Invoke this skill whenever files under `src/components/chat/`, `src/pages/chat/`, `src/stores/chatSessionStore.ts`, `src/pages/settings/AIProvider.tsx`, `src/pages/settings/PromptTemplates.tsx`, or the `chats`/`providers`/`url_fetch` Rust commands are involved.

## Architecture

### Frontend Components

```
src/pages/chat/
└── ChatSessionPage.tsx     # Chat UI — message list + input area

src/components/chat/
├── ChatSessionSidebar.tsx  # Session list sidebar with create/delete
├── MessageList.tsx         # Renders message history with markdown (react-markdown + remark-gfm)
├── ChatMessageInput.tsx    # Input with auto URL detection via regex + send button
├── UrlSourceCard.tsx       # Shows fetched URL content as a context card
└── AIMessage.tsx           # AI message bubble with streaming content updates
```

### Key Files & Roles

#### `ChatMessageInput.tsx`
Text input area with:
- Auto URL detection via the `URL_REGEX` constant from `chatSessionStore.ts`
- Send button that triggers `chatSessionStore.sendMessage()`
- Disabled state when sending/fetching URLs

#### `MessageList.tsx`
Renders the full message history:
- User messages on the right, AI messages on the left (or vice versa)
- Uses `react-markdown` with `remark-gfm` for markdown rendering in AI messages
- Shows URL context cards for messages that have them
- Infinite scroll pagination — scrolls to top to load older messages
- Auto-scrolls to bottom on new messages

#### `UrlSourceCard.tsx`
Displays fetched URL content as a compact card:
- Shows URL, title, and a snippet of content
- Used both inline in messages and as context indicators

#### `AIMessage.tsx`
AI message bubble:
- Renders streaming content (content that updates in real-time from SSE)
- Uses `react-markdown` for formatting
- Shows a spinner/indicator while streaming

#### `ChatSessionSidebar.tsx`
Left sidebar showing all chat sessions:
- Create new session button
- Session list with active indicator
- Delete session with confirmation
- Click to switch active session

#### `src/pages/chat/ChatSessionPage.tsx`
Route-level page combining sidebar + message list + input. Manages:
- Active session state
- Loads messages when session changes
- Coordinates send actions

### State Management (`src/stores/chatSessionStore.ts`)

The chat store is a custom **pub/sub** store (no Zustand/Redux). Key methods:

| Method | Description |
|---|---|
| `fetchSessions()` | Loads all chat sessions via `list_chat_sessions` |
| `createSession(data?)` | Creates a new session, sets it as active |
| `updateSession(id, data)` | Updates session title, model, prompt template |
| `deleteSession(id)` | Deletes session and removes from list |
| `setActiveSession(id)` | Switches active session, clears messages |
| `fetchMessages(sessionId)` | Loads last 10 messages with URL contexts |
| `fetchMoreMessages(sessionId, before)` | Loads 20 more messages before a given message ID |
| `sendMessage(sessionId, content)` | **Core method** — handles URL detection, fetching, streaming |

### `sendMessage()` Flow (Detailed)

1. **URL Detection**: `extractUrls(content)` uses regex `https?:\/\/[^\s<>"'\]\)`]+ to find URLs, deduplicates, strips trailing punctuation

2. **URL Fetching**: For new URLs (not already in message history), calls `invoke("fetch_urls", { urls })`. Non-blocking — failed fetches are logged but don't block the message

3. **Optimistic User Message**: Creates a temporary message with `id: "opt-{timestamp}"` and inserts it into the message list immediately

4. **Save User Message**: Calls `invoke("create_chat_message")` to persist, then replaces the optimistic message. Saves URL contexts via `invoke("save_url_contexts")`

5. **Build Prompt**: Constructs the messages array for the LLM API call:
   - System message (from prompt template or default: "You are a helpful AI assistant...")
   - URL context block as additional system message (if URLs were fetched)
   - Message history (last 50 messages, with URL context injection)
   - Current user message

6. **SSE Streaming**: Fetches the LLM API directly from the frontend with `stream: true`:
   ```typescript
   const response = await fetch(provider.api_url, {
     method: "POST",
     headers: { Authorization: `Bearer ${provider.api_key}`, "Content-Type": "application/json" },
     body: JSON.stringify({ model: provider.model, messages: apiMessages, stream: true }),
   });
   const reader = response.body!.getReader();
   ```
   Parses SSE `data:` lines, extracts `delta.content` chunks, and updates the assistant message in real-time

7. **Save Response**: When streaming completes, saves the full assistant message via `invoke("create_chat_message")` and refreshes sessions

### URL Context Architecture

```
URL Regex → extractUrls(content) → newUrls filter (no duplicates) →
  invoke("fetch_urls", { urls }) → Rust: reqwest GET → HTML parsing →
  Extracts: <title>, <meta name="description">, <body> text →
  Content truncated to 5000 chars, script/style/nav/footer/header stripped →
  Returns FetchResult[] → formatContextBlock() → System message injection

URL contexts are persisted: message_url_contexts table (FK→chat_messages ON DELETE CASCADE)
```

### Backend Commands

#### `commands/chats.rs`
| Command | Signature | Description |
|---|---|---|
| `list_chat_sessions` | `() → Vec<ChatSession>` | Lists all sessions (newest first) |
| `create_chat_session` | `(title?, model_id?, prompt_template_id?) → ChatSession` | Creates new session |
| `update_chat_session` | `(id, title?, model_id?, prompt_template_id?) → ChatSession` | Updates session fields |
| `delete_chat_session` | `(id) → ()` | Deletes session (cascades to messages) |
| `get_chat_messages` | `(chat_id, before?, limit) → Vec<ChatMessage>` | Paginated — fetches messages before a given ID |
| `create_chat_message` | `(chat_id, role, content) → ChatMessage` | Creates a message |
| `list_prompt_templates` | `() → Vec<PromptTemplate>` | Lists all prompt templates |
| `create_prompt_template` | `(name, content, category?) → PromptTemplate` | Creates a template |
| `update_prompt_template` | `(id, name?, content?, category?) → PromptTemplate` | Updates template |
| `delete_prompt_template` | `(id) → ()` | Deletes template |

#### `commands/providers.rs`
| Command | Signature | Description |
|---|---|---|
| `list_providers` | `() → Vec<AIProvider>` | Lists all AI providers |
| `create_provider` | `(name, provider, api_url, api_key, model) → AIProvider` | Creates a provider |
| `update_provider` | `(id, name?, provider?, api_url?, api_key?, model?) → AIProvider` | Updates provider |
| `delete_provider` | `(id) → ()` | Deletes provider |
| `get_setting` | `(key) → String?` | Gets a key-value setting |
| `set_setting` | `(key, value) → ()` | Sets a key-value setting |

#### `commands/url_fetch.rs`
| Command | Signature | Description |
|---|---|---|
| `fetch_urls` | `(urls: Vec<String>) → Vec<FetchResult>` | Fetches URLs via reqwest, parses HTML |
| `save_url_contexts` | `(message_id, contexts: Vec<FetchResult>) → ()` | Persists URL contexts for a message |
| `get_url_contexts` | `(message_id) → Vec<UrlContext>` | Retrieves URL contexts for a message |

### Database Schema

```sql
chat_sessions        (id TEXT PK, title TEXT, model_id TEXT, prompt_template_id TEXT, created_at, updated_at)
chat_messages        (id TEXT PK, chat_id TEXT FK→sessions ON DELETE CASCADE, role TEXT, content TEXT, created_at)
prompt_templates     (id TEXT PK, name TEXT, content TEXT, description TEXT, is_default INT, created_at, updated_at)
ai_providers         (id TEXT PK, name TEXT, provider TEXT, api_url TEXT, api_key TEXT, model TEXT, is_active INT, is_default INT, created_at, updated_at)
settings             (id TEXT PK, key TEXT UNIQUE, value TEXT, created_at, updated_at)
message_url_contexts (id TEXT PK, message_id TEXT FK→messages ON DELETE CASCADE, url TEXT, title TEXT, content TEXT, created_at)
```

Indexes: `idx_chat_messages_chat (chat_id)`, `idx_url_contexts_message (message_id)`

### Settings Pages

- **`src/pages/settings/AIProvider.tsx`** — CRUD page for AI providers (name, provider type, API URL, API key, model)
- **`src/pages/settings/PromptTemplates.tsx`** — CRUD page for prompt templates (name, content, description, set as default)

## SSE Streaming Architecture

```
Frontend (browser)                   LLM API (OpenAI-compatible)
      │                                      │
      │  POST /chat/completions              │
      │  { model, messages, stream: true }   │
      │─────────────────────────────────────>│
      │                                      │
      │  SSE: data: {"choices":[{"delta":    │
      │  {"content":"Hello"}}]}              │
      │<─────────────────────────────────────│
      │                                      │
      │  ...chunks stream in...              │
      │                                      │
      │  SSE: data: [DONE]                   │
      │<─────────────────────────────────────│
```

Key points:
- **No Rust proxy for streaming** — the frontend fetches the LLM API directly
- SSE parsing uses `response.body.getReader()` with a `ReadableStream`
- Each chunk is parsed: `line.slice(6)` removes "data: " prefix, then `JSON.parse`
- The `[DONE]` signal ends streaming
- The full accumulated content is saved to the backend after streaming completes

## Commands

```bash
# Run chat-related tests
npx vitest run src/test/message-list.spec.tsx src/test/url-reader.spec.ts

# Run all frontend tests
npm test

# Run rust URL fetch tests
cd src-tauri && cargo test url_fetch
```

## Important Gotchas

1. **AI Chat streaming is frontend-side only.** The Rust backend does NOT proxy AI streaming. The frontend fetches the LLM API directly. Do NOT route streaming through Tauri commands — it would add latency and complexity.

2. **API keys are stored in plaintext.** The `ai_providers` table stores `api_key` as plaintext. This is an explicit trade-off for a single-user desktop app.

3. **URL HTML parsing is simple regex-based.** The Rust `url_fetch.rs` uses string-based HTML parsing (regex for title/meta, tag stripping for body). It is NOT a full DOM parser — this is intentional to avoid heavy dependencies.

4. **URL content is truncated to 5000 characters.** The `fetch_urls` command truncates extracted body content to 5000 chars. Script, style, nav, footer, and header tags are stripped.

5. **Message pagination uses "before" cursor.** `get_chat_messages` accepts a `before` parameter (a message ID) and returns messages created before that ID. The initial load fetches 11 messages but only displays the newest 10 (the 11th is used to determine if `hasMore` is true).

6. **URL deduplication is done client-side.** `hasUrlInHistory()` checks if a URL already exists in any fetched context in the current message list. This prevents re-fetching the same URL within a session.

7. **Prompt templates are injected as a system message.** When a session has a `prompt_template_id`, the template's content replaces the default system prompt. URL contexts are injected as a SEPARATE system message (not appended to the main system prompt).

8. **The store uses optimistic messages.** While the backend saves the user message and the AI streams its response, temporary messages with `opt-` and `stream-` ID prefixes appear in the list. If an error occurs, ALL optimistic messages are removed (filtered by prefix).

9. **Session title is auto-generated.** After the first AI response, the sessions list is refreshed. The backend may auto-generate a title from the first user message.