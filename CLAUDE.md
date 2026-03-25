# AMCAS — Autonomous Multi-Agent Cognitive System

## Project Overview

**AMCAS** (Autonomous Multi-Agent Cognitive System) is a full-stack AI agent platform that demonstrates sophisticated multi-agent orchestration, real-time debate systems, and knowledge retrieval capabilities. It's designed as a research and analysis tool where multiple AI agents collaborate to solve complex tasks.

The system features 5 distinct operational modes:
- **Standard Chat**: Single tool-calling agent with calculator, knowledge retrieval, and datetime tools
- **Multi-Agent Mode**: Orchestrator with parallel researchers → aggregator → critic pipeline
- **Deep Research**: Same as multi-agent but shows only final synthesized result
- **Debate Arena**: Two-agent structured debate with streaming updates
- **Memory Intelligence**: Vector-based knowledge retrieval and clustering visualization

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React 19)                     │
│  • Next.js / Vite • TypeScript • Tailwind • shadcn/ui          │
│  • Zustand (state) • React Flow (graph viz) • Recharts        │
├─────────────────────────────────────────────────────────────────┤
│                         API Layer (FastAPI)                    │
│  POST /chat               → Tool Agent (LangGraph)             │
│  POST /orchestrator/task  → Multi-agent Orchestrator           │
│  GET /debate/stream       → Debate System (SSE)                │
│  POST /upload-pdf         → PDF Processor → ChromaDB           │
├─────────────────────────────────────────────────────────────────┤
│              Backend Components (LangGraph + Groq)              │
│  • convo.py         - Tool-calling agent with calculator       │
│  • orchestrator.py  - Parallel multi-agent workflow            │
│  • debater.py       - Two-agent debate with streaming          │
│  • llm_engine.py    - Groq LLM factory                         │
├─────────────────────────────────────────────────────────────────┤
│                    External Services                            │
│  • Groq API (LLaMA models)   • ChromaDB (vector storage)       │
│  • Sentence Transformers (BGE embeddings)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI** - REST API with CORS and streaming support
- **LangGraph** - State graph-based agent orchestration
- **LangChain** - Tool abstractions and text processing
- **Groq** - High-performance LLM inference (LLaMA models)
- **ChromaDB** - Vector database for knowledge retrieval
- **Sentence Transformers** - Embedding model (BAAI/bge-small-en-v1.5)
- **PyMuPDF (fitz)** - PDF text extraction
- **python-dotenv** - Environment configuration

### Frontend
- **React 19** - UI framework
- **TypeScript 5.7** - Type safety
- **Vite 7** - Build tool and dev server
- **Tailwind CSS 4.2** - Utility-first styling
- **shadcn/ui** - Component library (Radix UI primitives)
- **React Router DOM 7** - Client-side routing
- **Zustand 5** - Lightweight state management
- **React Flow (xyflow) 12** - Task graph visualization
- **Recharts 2** - Charting for analytics
- **react-markdown** - Markdown rendering
- **Lucide React** - Icon library
- **pnpm** - Package manager

---

## Project Structure

```
D:\Learn\Python\Deploy\Agentrix.io/
├── backend/
│   ├── main.py                    # FastAPI app & endpoints
│   ├── convo.py                   # Tool-calling agent (LangGraph)
│   ├── orchestrator.py            # Multi-agent orchestrator
│   ├── debater.py                 # Debate streaming system
│   ├── llm_engine.py              # LLM factory & Groq client
│   ├── schemas/
│   │   └── schema.py              # Pydantic request/state models
│   └── utils/
│       ├── tools.py               # Tool definitions (calc, retriever, datetime)
│       ├── chroma_embed.py        # ChromaDB client & embeddings
│       └── pdf_processor.py       # PDF extraction & chunking
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Root component with routing
│   │   └── main.tsx               # Entry point
│   ├── components/
│   │   ├── amcas/
│   │   │   ├── AppShell.tsx       # Main layout with sidebar
│   │   │   ├── Sidebar.tsx        # Navigation + theme toggle
│   │   │   ├── LandingPage.jsx    # Landing/welcome page
│   │   │   ├── ChatPage.tsx       # Chat interface (standard + orchestrator)
│   │   │   ├── DebatePage.tsx     # Debate arena
│   │   │   ├── TaskGraphPage.tsx  # Visual execution graph
│   │   │   ├── MemoryPage.tsx     # Knowledge clustering & stats
│   │   │   ├── ReflectionPage.tsx # Self-reflection metrics
│   │   │   ├── pages/             # Additional page components
│   │   │   ├── ChatMessage.tsx    # Message rendering
│   │   │   ├── DebatePanel.tsx    # Individual debater panel
│   │   │   ├── MemoryCard.tsx     # Memory/knowledge card
│   │   │   ├── GraphNodeCard.tsx  # Task graph node details
│   │   │   ├── ReflectionReport.tsx
│   │   │   ├── ConfidenceBar.tsx
│   │   │   ├── RadarChart.tsx
│   │   │   └── ToolSelector.tsx   # Mode selector + file upload
│   │   └── ui/                    # shadcn/ui components (40+ components)
│   ├── lib/
│   │   ├── api.ts                 # API client functions
│   │   ├── store.ts               # Zustand global state
│   │   ├── mock-api.ts            # Mock data for demo pages
│   │   └── utils.ts               # Utility functions
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   ├── use-toast.ts
│   │   └── use-css-vars.ts        # Theme-aware CSS variable reader
│   ├── styles/
│   │   └── globals.css            # Global styles + Tailwind imports
│   ├── package.json               # Dependencies & scripts
│   ├── vite.config.ts             # Vite configuration
│   ├── tsconfig.json              # TypeScript configuration
│   ├── components.json            # shadcn/ui config
│   └── .env.local                 # Frontend env (NEXT_PUBLIC_API_URL)
│
├── package.json                   # Root package.json (minimal)
├── pnpm-lock.yaml                 # Dependency lock
├── README.md                      # Project documentation
├── .gitignore
└── chroma_storage/                # ChromaDB persistent storage
```

---

## Key Features

### 1. Multi-Modal Chat Interface

**Location**: `frontend/components/amcas/pages/ChatPage.tsx`

The main chat interface supports three modes:

- **Standard**: Single tool-calling agent with access to:
  - `calculator(expression)` - Safe math evaluation
  - `knowledge_retriever(query)` - ChromaDB similarity search
  - `get_current_datetime(timezone)` - Time utilities

- **Multi-Agent**: Orchestrates 2-4 specialized agents:
  1. Researchers (parallel) - gather facts & alternative perspectives
  2. Analyst/Aggregator - synthesize findings into 7-section report
  3. Critic - evaluate quality with confidence & consistency scores

- **Deep Research**: Same as multi-agent but hides intermediate steps

**Features**:
- Markdown rendering with syntax highlighting
- Chat history persistence (localStorage)
- PDF upload with automatic knowledge ingestion
- Mode selector with tool integration
- Real-time processing indicators

### 2. Orchestrator & Task Graph

**Backend**: `backend/orchestrator.py` | **Frontend**: `TaskGraphPage.tsx`

The orchestrator creates a directed acyclic graph (DAG) of agent executions:

```
Orchestrator
    │
    ├─→ Researcher 1 (facts, data, background)
    │
    ├─→ Researcher 2 (debates, gaps, alternative views)
    │       │
    │       └─→ Aggregator (7-section report)
    │               │
    │               └─→ Critic (quality evaluation)
    │
    └─→ Final Report
```

**Frontend Visualization**:
- Custom SVG graph layout (no React Flow dependency)
- Color-coded nodes by type
- Interactive node selection showing detailed output
- Status indicators (pending/running/completed/error)
- Fixed coordinate layout for consistent visualization

**Data Flow**:
- Async parallel execution with `asyncio.gather()`
- State accumulated in `OrchestratorState` TypedDict
- Step logs streamed to frontend for progress indicators
- Final output includes individual agent results and critic scores

### 3. Debate Arena

**Backend**: `backend/debater.py` | **Frontend**: `DebatePage.tsx`

Two-agent structured debate with:
- **Agent Proposer (A)**: Argues FOR the topic (assertive, evidence-based)
- **Agent Critic (B)**: Argues AGAINST (direct, challenging)
- **Impartial Verifier**: Provides final verdict after all rounds

**Streaming**:
- Server-Sent Events (SSE) for real-time message updates
- Round-by-round progression with live statistics
- Contradiction counting and resolution status
- User can inject their perspective between rounds

**Frontend Features**:
- Split-panel layout (Proposer | Critic)
- Resizable panels (React Resizable Panels)
- Verifier panel appears at end with final verdict
- Live round counter and contradiction tracker
- Terminal-style aesthetic

### 4. Memory Intelligence

**Frontend**: `MemoryPage.tsx`

Visual representation of the knowledge base using mock data (would integrate with ChromaDB in production):

- **Retrieved Tasks**: Cards showing past similar queries with similarity scores
- **Knowledge Clusters**: SVG scatter plot of semantic clusters with size representing density
- **Growth Timeline**: Line chart (Recharts) showing knowledge quality over time
- **Memory Influence**: Progress bars showing which past tasks influence current results
- **Stats Dashboard**: Total tasks, average similarity, quality score

**Design**:
- Dynamic viewBox calculation based on cluster positions
- Theme-aware SVG colors using CSS custom properties
- Hover effects and smooth animations

### 5. Self-Reflection Lab

**Frontend**: `ReflectionPage.tsx`

Metacognitive quality assessment display:

- **Score Cards**: Confidence, Logical Consistency, Factual Reliability
- **Self-Correction Status**: Shows if agent applied corrections during reasoning
- **Radar Chart**: Multi-dimensional capability profile
- **Performance Matrix**: Circular progress indicators for each metric
- **Structured Report**: Detailed reflection issues (mock data)

Uses custom SVG radar chart and Recharts for visualizations.

---

## API Reference

### Endpoints

| Method | Route | Description | Body |
|--------|-------|-------------|------|
| POST | `/chat` | Standard tool-calling agent | `{ query: string }` |
| POST | `/orchestrator/task` | Multi-agent orchestration | `{ task: string }` |
| GET | `/debate/stream?topic=...&rounds=N` | Debate with streaming | `topic`, `rounds` |
| POST | `/upload-pdf` | Upload & index PDFs | `FormData: files[], user_id` |

All endpoints return JSON except `/debate/stream` which returns SSE.

### Request/Response Types

See `frontend/lib/api.ts` for full TypeScript interfaces:

- `ChatResult` - Standard chat response with metadata
- `OrchestratorApiResponse` - Multi-agent result with subtasks & critic scores
- `DebateMessage` - Streaming debate events (type, content, round, agent)

---

## Configuration

### Backend Environment (`.env`)

```bash
GROQ_API_KEY=gsk_...
```

The backend loads this via `python-dotenv` in `backend/llm_engine.py` and `backend/chroma_embed.py`.

### Frontend Environment (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
# or
VITE_API_URL=http://localhost:8000
```

Check priority in `frontend/lib/api.ts` (NEXT_PUBLIC_API_URL → VITE_API_URL → localhost:8000).

### LLM Configuration

**`backend/llm_engine.py`**:
- **Default**: `openai/gpt-oss-20b` (Groq)
- **Alternate** (change=True): `meta-llama/llama-4-scout-17b-16e-instruct`
- Temperature: Configurable per call (default 0.7)

---

## Running the Project

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Unix/Mac:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn langchain langchain-groq langgraph groq chromadb python-dotenv pymupdf

# Configure environment
# Create .env file with GROQ_API_KEY

# Run server
python main.py
# → http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install
# or: npm install

# Configure API URL (if not localhost:8000)
cp .env.local.example .env.local
# Edit .env.local with your backend URL

# Run dev server
pnpm dev
# → http://localhost:3000
```

### Python Dependencies (list)

From README.md and code inspection:
- fastapi
- uvicorn[standard]
- langchain
- langchain-groq
- langgraph
- groq
- chromadb
- sentence-transformers
- pymupdf
- python-dotenv
- pydantic

---

## Design Patterns & Architecture Decisions

### 1. LangGraph State Graphs

Both `convo.py` and `orchestrator.py` use LangGraph's `StateGraph` with `TypedDict` states:

**Tool Agent** (`AgentState`):
- Single agent node + tool execution node
- Conditional edge: if `tool_calls` exist → execute tools → loop back
- Accumulates messages via `operator.add`

**Orchestrator** (`OrchestratorState`):
- Sequential flow: orchestrator → parallel_researchers → aggregator → critic
- Parallel execution via `asyncio.gather()` inside node function
- Subtask tracking with progress logs
- Critic provides quality metrics (0-100 scale)

**Benefits**:
- Clear separation of concerns
- Reusable state patterns
- Easy to extend with new node types
- Built-in persistence and checkpointing (if needed)

### 2. Parallel Execution Strategy

The orchestrator uses a hybrid approach:
- **Sequential graph** for high-level flow control
- **Async parallelism** inside `parallel_researchers_node()` for concurrent LLM calls
- ThreadPoolExecutor in `pdf_processor.py` for concurrent PDF processing

This balances orchestration clarity with performance.

### 3. Streaming vs Non-Streaming

- **Debate**: Full SSE streaming to frontend using `TextEventStream` from FastAPI
- **Orchestrator**: Non-streaming JSON response but emits step logs for progress indicators
- **Chat**: Non-streaming (backend uses synchronous `.invoke()`)

Streaming chosen for debate because it's a long-running interactive experience (3 rounds × 2 agents). Orchestrator logging provides feedback without complex client-side streaming.

### 4. Vector Database Integration

**ChromaDB** is used as a persistent knowledge store:
- Embeddings: `BAAI/bge-small-en-v1.5` (sentence-transformers)
- Collection: `"knowledge_base"` with persistent storage at `../chroma_storage`
- Chunking: `RecursiveCharacterTextSplitter` with size=1000, overlap=200
- Metadata: `source` (filename), `user_id` attached to each document

PDFs are processed and ingested on upload, making them available via `knowledge_retriever` tool.

### 5. State Management (Frontend)

**Zustand** store (`frontend/lib/store.ts`) manages:
- Chat mode selection (standard/multi-agent/deep-research)
- Message history (auto-persisted to localStorage)
- Chat sessions (multiple concurrent conversations)
- Debate state (messages, round counters)
- Task graph data (nodes/edges for visualization)
- UI state (sidebar collapsed, history panel, theme sync)

**Persistence**: Chat history serialized to localStorage with automatic rehydration on app load.

### 6. Component Architecture

Frontend uses a feature-based structure:
- `components/amcas/` - Domain-specific components
- `components/amcas/pages/` - Route-based page components
- `components/ui/` - shadcn/ui primitive components
- Layout: `AppShell` with `Sidebar` + `Routes` + global `HistoryPanel`

**Routing**: React Router with protected route (simple localStorage auth check).

### 7. Theme System

Tailwind CSS with CSS custom properties for dynamic theming:
- `theme-provider.tsx` wraps app with next-themes
- All colors use `var(--color-...)` syntax
- SVG elements read CSS variables via `style` attributes
- Dark/light mode toggle in Sidebar

---

## Extending the System

### Add a New Tool

1. **Backend**: Define in `backend/utils/tools.py`

```python
from langchain_core.tools import tool

@tool
def my_new_tool(param: str) -> str:
    """Tool description for LLM"""
    # Implementation
    return result
```

Add to `get_tools_list()` in same file.

2. **Frontend**: No changes needed - tool appears automatically in tool-calling agent.

### Add a New Agent Type to Orchestrator

1. In `backend/orchestrator.py`, modify `orchestrator_node_parallel()` to create a new subtask type:

```python
subtasks = [
    {"id": 1, "description": "...", "agent_type": "researcher", ...},
    {"id": 2, "description": "...", "agent_type": "new_agent", ...},
    {"id": 3, "description": "...", "agent_type": "aggregator", ...},
]
```

2. Update `GraphNodeCard.tsx` to handle new `GraphNodeType` if you want graph visualization.

### Customize Graph Visualization

Frontend: `frontend/components/amcas/pages/TaskGraphPage.tsx`

The SVG layout uses fixed coordinates. For dynamic layouts, consider:
- Import `reactflow` and replace SVG with `<ReactFlow />` nodes
- Add more node types to `GraphNodeType` enum
- Implement force-directed or hierarchical layout algorithm

### Add a New Page

1. Create component in `frontend/components/amcas/pages/YourPage.tsx`
2. Add route in `App.tsx`:
```tsx
<Route path="/yourpage" element={<YourPage />} />
3. Add nav item in `Sidebar.tsx` `NAV_ITEMS` array
4. Store will auto-persist if using its hooks

---

## Data Models

### Backend Schemas

**`backend/schemas/schema.py`**:

```python
class QueryRequest(BaseModel):
    query: str

class TaskRequest(BaseModel):
    task: str

class DebateRequest(BaseModel):
    topic: str
    rounds: int = 3

# LangGraph States:
AgentState = TypedDict("AgentState", {
    "messages": Annotated[Sequence[BaseMessage], operator.add]
})

OrchestratorState = TypedDict("OrchestratorState", {
    "original_task": str,
    "subtasks": list[dict],
    "current_subtask_index": int,
    "final_result": str,
    "step_logs": list[str],
    "critic_confidence": int,
    "critic_logical_consistency": int,
    "critic_feedback": str,
})
```

### Frontend Types

**`frontend/lib/store.ts`** (excerpt):

```typescript
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: ChatMode;
  timestamp: Date;
  meta?: {
    confidenceScore: number;
    reasoningDepth: number;
    toolsUsed: string[];
    logicalConsistency?: number;
    criticFeedback?: string;
  };
}

export interface GraphNode {
  id: string;
  type: "orchestrator" | "agent" | "critic" | "output";
  label: string;
  description: string;
  status: "pending" | "running" | "completed" | "error";
  x: number;
  y: number;
  output?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  description: string;
  messages: ChatMessage[];
  mode: ChatMode;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Known Limitations & Future Work

### Current Limitations

1. **Mock Data**: Memory and Reflection pages use static `MOCK_DATA` instead of live API integration
2. **Auth**: Simple localStorage flag; no real authentication
3. **ChromaDB**: Embedded single-user store; not suitable for multi-tenant SaaS
4. **PDF Processing**: Synchronous in request cycle; could timeout on large batches
5. **Orchestrator**: Fixed 2 researchers + 1 aggregator + 1 critic; not configurable
6. **Error Handling**: Minimal retry logic for LLM API failures
7. **Rate Limiting**: None implemented
8. **Cost Control**: No token limits or budget tracking

### Suggested Improvements

1. **Authentication**: Integrate Auth0, Clerk, or NextAuth.js
2. **Streaming Orchestration**: SSE for real-time agent updates during multi-agent tasks
3. **Configurable Agents**: UI for selecting agent types, counts, and prompts
4. **Production Database**: Replace ChromaDB with Pinecone, Weaviate, or pgvector
5. **Background Jobs**: Celery/Redis queue for PDF processing
6. **Evaluation Framework**: Automated EvalAI-style scoring of agent outputs
7. **Export**: PDF/JSON export of reports and graphs
8. **Collaboration**: Shared workspaces, team accounts, comment threads
9. **Observability**: LangSmith integration for tracing and debugging
10. **Testing**: Unit tests for backend agents, E2E tests for frontend (Playwright)

---

## Development Notes

### Code Style

- **Python**: Type hints, Pydantic validation, async/await for I/O
- **TypeScript**: Strict mode enabled, explicit return types
- **React**: Client components only ("use client" directives), functional components with hooks
- **CSS**: Tailwind utility classes only (no custom CSS files except globals)
- **Naming**: PascalCase for components, camelCase for functions/vars, SCREAMING_SNAKE_CASE for constants

### Debugging

**Backend**:
```bash
# Enable logging
export LOG_LEVEL=DEBUG
python main.py

# Test endpoints with curl
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{"query":"hello"}'
```

**Frontend**:
- React DevTools enabled
- Vite dev server with HMR
- Network tab for API debugging
- Console logs for store state inspection

### Performance

- **Backend**: Streaming responses avoid buffering; LLM calls are the bottleneck
- **Frontend**: Virtualized lists not implemented (assume <100 messages per chat)
- **ChromaDB**: Persistent storage; embeddings cached globally in `chroma_embed.py`
- **PDF Processing**: Thread pool (max_workers=5) for concurrent parsing

---

## Resources

- **LangGraph**: https://langchain-ai.github.io/langgraph/
- **Groq**: https://console.groq.com/docs
- **ChromaDB**: https://docs.trychroma.com/
- **shadcn/ui**: https://ui.shadcn.com/
- **React Flow**: https://reactflow.dev/

---

## License

Unspecified. Check repository for license file.

---

**Maintained by**: Agentrix.io team
**Version**: 2.4.1 (as shown in Sidebar)
**Last Updated**: March 2025
