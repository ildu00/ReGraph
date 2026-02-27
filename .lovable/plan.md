
## ReGraph Claw — AI Agent Builder in the Dashboard

### Concept
ReGraph Claw = a new "Claw" tab in the dashboard where users create, configure, and run autonomous AI agents. Each agent has a name, system prompt, chosen model, and a set of enabled "tools" (web search, code execution, document reading, etc.). The agent chat is persistent and runs multi-step reasoning loops — the model can call tools, get results back, and continue until it's done. Think: personal Jarvis, zero infra required.

### Architecture

```
Dashboard → "Claw" tab
├── Agent Library (list of user's saved agents)
│   ├── Create / Edit agent modal
│   │   ├── Name, avatar emoji, description
│   │   ├── System prompt (large textarea)
│   │   ├── Model selector (reuse MODELS list)
│   │   └── Tool toggles: Web Search, Code Interpreter, Document Reader, Image Gen, Calculator
│   └── Agent card → click to open Agent Chat
└── Agent Chat (full-screen like ChatTab)
    ├── Shows agent name + enabled tools as badges
    ├── Agentic loop: model can return tool_calls → frontend executes → sends result back
    └── Persist conversation in DB (per agent)
```

### Database changes
New tables needed:
1. **`claw_agents`** — user's saved agent configs
   - `id, user_id, name, emoji, description, system_prompt, model_id, tools (jsonb), created_at, updated_at`
   - RLS: users own their agents

2. **`claw_conversations`** — chat sessions per agent  
   - `id, user_id, agent_id, title, created_at, updated_at`
   - RLS: users own their conversations

3. **`claw_messages`** — persisted messages
   - `id, conversation_id, role (user/assistant/tool), content, tool_name, tool_input (jsonb), tool_result (jsonb), created_at`
   - RLS: via conversation ownership (user_id check)

### Implementation plan

**1. DB migration** — create 3 tables above with RLS policies

**2. New `ClawTab.tsx`** — top-level component with two views:
   - `view === 'library'` → AgentLibrary component
   - `view === 'chat'` → AgentChat component

**3. `AgentLibrary.tsx`** — grid of agent cards
   - Fetch from `claw_agents` for current user
   - "New Agent" button → opens `AgentFormModal`
   - Each card: emoji + name + description + model badge + tool chips + "Open" button + edit/delete

**4. `AgentFormModal.tsx`** — create/edit agent
   - Fields: name, emoji picker (simple input), description, system prompt, model, tools
   - Available tools: `web_search`, `code_interpreter`, `image_generation`, `calculator`, `document_reader`

**5. `AgentChat.tsx`** — agentic conversation UI
   - Load/create conversation for selected agent
   - Full agentic loop with tool execution:
     - `web_search` → calls a lightweight search edge function or returns mock for MVP
     - `calculator` → executes in-browser via `eval` (sandboxed numeric only)
     - `code_interpreter` → send to inference with code-execution prompt, show result
     - `image_generation` → calls existing image gen model
   - Stream-style message rendering, tool call blocks shown inline with spinner → result

**6. Edge function `claw-agent` (optional for MVP)** — server-side agentic loop
   - For MVP, the loop runs client-side: send messages array + tools → get response → if tool_calls present, execute → append tool result → call again

**7. Add "Claw" nav item to Dashboard** — icon: `Scissors` or custom claw emoji icon from lucide (`Grip` or `Workflow`)

### Files to create/edit
- `supabase/migrations/` — new migration for 3 tables
- `src/components/dashboard/ClawTab.tsx` (new)
- `src/components/dashboard/claw/AgentLibrary.tsx` (new)
- `src/components/dashboard/claw/AgentFormModal.tsx` (new)
- `src/components/dashboard/claw/AgentChat.tsx` (new)
- `src/pages/Dashboard.tsx` — add Claw tab + nav item

### MVP tool implementations (client-side)
| Tool | Implementation |
|------|---------------|
| `calculator` | Parse + eval numeric expression in browser |
| `web_search` | Return "Search unavailable" placeholder (upgradeable) |
| `code_interpreter` | Send code block to inference API with execution prompt |
| `image_generation` | Call existing image gen model, display result inline |
| `document_reader` | Parse text from attached file (already in ChatTab) |

All tool calls + results are persisted in `claw_messages` so the conversation is fully resumable across sessions.
