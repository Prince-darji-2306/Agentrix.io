# AMCAS — Autonomous Multi-Agent Cognitive System

## Project Overview

**AMCAS** (Autonomous Multi-Agent Cognitive System) is a full-stack AI agent platform that demonstrates sophisticated multi-agent orchestration, real-time debate systems, and knowledge retrieval capabilities. It is designed as a research, analysis, and code generation tool where multiple AI agents collaborate to solve complex tasks.

The system features an intelligent **Smart Orchestrator** that classifies queries and routes them to specialized pipelines:
- **Standard Chat**: Single tool-calling agent with calculator, knowledge retrieval, and datetime tools.
- **Multi-Agent Mode**: Orchestrator with parallel researchers → aggregator → critic pipeline (Deep Research).
- **Coding Pipeline**: Specialized multi-agent workflow for software implementation and review.
- **Debate Arena**: Two-agent structured debate with streaming updates and verifier.
- **Memory Intelligence**: Vector-based knowledge retrieval and clustering visualization.

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
│  POST /chat                       → Tool Agent (LangGraph)     │
│  POST /orchestrator/task          → Multi-agent Orchestrator   │
│  POST /smart-orchestrator/stream  → Smart Router (SSE)         │
│  GET /debate/stream               → Debate System (SSE)        │
│  POST /upload-pdf                 → PDF Processor → ChromaDB   │
├─────────────────────────────────────────────────────────────────┤
│              Backend Components (LangGraph + Groq)              │
│  • smart_orchestrator.py - Query classification & routing      │
│  • coding_agent.py      - Parallel coding & review pipeline    │
│  • orchestrator.py      - Parallel multi-agent research        │
│  • convo.py             - Tool-calling agent with calculator   │
│  • debater.py           - Two-agent debate with streaming      │
│  • llm_engine.py        - Groq LLM factory                     │
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
- **FastAPI** - REST API with CORS and SSE streaming support
- **LangGraph** - State graph-based agent orchestration
- **LangChain** - Tool abstractions and text processing
- **Groq** - High-performance LLM inference (LLaMA models)
- **ChromaDB** - Vector database for knowledge retrieval
- **Sentence Transformers** - Embedding model (`BAAI/bge-small-en-v1.5`)
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
│   ├── smart_orchestrator.py      # Query classification & SSE routing
│   ├── coding_agent.py            # Multi-agent coding pipeline
│   ├── orchestrator.py            # Multi-agent research orchestrator
│   ├── convo.py                   # Tool-calling agent (LangGraph)
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
│   │   │   ├── ChatPage.tsx       # Main Chat interface (with Smart Routing)
│   │   │   ├── DebatePage.tsx     # Debate arena
│   │   │   ├── TaskGraphPage.tsx  # Visual execution graph
│   │   │   ├── MemoryPage.tsx     # Knowledge clustering & stats
│   │   │   ├── ReflectionPage.tsx # Self-reflection metrics
│   │   │   ├── ChatMessage.tsx    # Message rendering
│   │   │   ├── DebatePanel.tsx    # Individual debater panel
│   │   │   ├── MemoryCard.tsx     # Memory/knowledge card
│   │   │   ├── GraphNodeCard.tsx  # Task graph node details
│   │   │   └── ToolSelector.tsx   # Mode selector + file upload
│   │   └── ui/                    # shadcn/ui components
│   ├── lib/
│   │   ├── api.ts                 # API client functions (SSE handling)
│   │   ├── store.ts               # Zustand global state
│   │   ├── mock-api.ts            # Simulated data for experimental features
│   │   └── utils.ts               # Utility functions
│   ├── styles/
│   │   └── globals.css            # Global styles + Tailwind imports
│   ├── package.json               # Dependencies & scripts
│   ├── vite.config.ts             # Vite configuration
   └── .env.local                 # Frontend env (VITE_API_URL)

├── chroma_storage/                # ChromaDB persistent storage
└── CLAUDE.md                      # This documentation
```

---

## Key Features & Pipelines

### 1. Smart Orchestrator & Routing
**Location**: `backend/smart_orchestrator.py` | **Frontend**: `api.ts`

The system uses an LLM-based intelligent routing layer to analyze user intent and select the optimal execution path.
- **Classification**: Uses LLM to categorize queries into `standard`, `deep_research`, or `code`.
- **SSE Streaming**: Emits real-time events (`route`, `stage`, `node_update`, `plan`, `code_section`, `final`, `done`) to the frontend for progressive UI updates.
- **Automatic Parallelism**: Triggers complex multi-agent workflows without manual mode switching.

### 2. Multi-Agent Coding Pipeline
**Backend**: `backend/coding_agent.py` | **Frontend**: `TaskGraphPage.tsx`

A specialized pipeline for implementing software tasks using a structured LangGraph state machine:
1.  **Code Planner**: Acts as a senior architect, decomposing the task into 3 logical, independent subtasks and generating a **shared contract** (YAML/JSON) to enforce interface consistency (naming, file organization, API contracts) across agents.
2.  **Parallel Coders**: Three specialized agents implement the assigned subtasks concurrently using `asyncio.gather`. Each coder provides implementation code followed by a brief technical explanation.
3.  **Code Aggregator**: Merges the separate snippets into a cohesive codebase. It supports **multi-file outputs** using a specific separator syntax: `# === FILE: filename ===`, which the frontend can parse for syntax highlighting.
4.  **Code Reviewer & Retry Loop**: A strict reviewer evaluates the merged code for logic errors, confidence, and consistency. It triggers up to 2 automated retries of the aggregator if critical errors or contract violations are detected.

### 3. Deep Research Orchestrator
**Backend**: `backend/orchestrator.py`

Handles complex information gathering using a multi-agent synthesis pipeline:
- **Parallel Researchers**: Multiple agents gather facts and alternative perspectives concurrently.
- **Analyst/Aggregator**: Synthesizes findings into a structured **7-section report** (Executive Summary, Key Findings, Evidence, Analysis, Contradictions, Conclusion, Sources).
- **Critic**: Evaluates the report for accuracy and logical consistency, assigning confidence scores.

### 4. Debate Arena
**Backend**: `backend/debater.py` | **Frontend**: `DebatePage.tsx`

Structured two-agent debate with:
- **Agent Proposer (FOR)**: Confident debater presenting compelling arguments and countering opponents.
- **Agent Critic (AGAINST)**: Sharp debater challenging assumptions and exposing weaknesses.
- **Round-by-round streaming** via SSE.
- **Impartial Verifier**: Summarizes key arguments and provides a final verdict after all rounds.

### 5. Knowledge Retrieval (RAG)
**Backend**: `utils/chroma_embed.py` | `utils/pdf_processor.py`

- **Vector Storage**: ChromaDB persistent storage in `chroma_storage/knowledge_base`.
- **Embedding Model**: Uses `BAAI/bge-small-en-v1.5` via Sentence Transformers.
- **PDF Processing**: Parallelized extraction using `PyMuPDF` and multithreading.
- **Chunking Strategy**: `RecursiveCharacterTextSplitter` with `chunk_size=1000` and `chunk_overlap=200`.
- **Knowledge Tool**: Standard agents query the knowledge base via similarity search.

---

## Reality vs. Simulation

To provide a complete vision of an autonomous agent platform, some experimental features are currently simulated on the frontend while the core orchestration logic is fully functional.

| Feature | Status | Implementation Details |
|---------|--------|------------------------|
| **Smart Routing** | **REAL** | LLM-based intent classification and dynamic SSE streaming. |
| **Coding Pipeline** | **REAL** | 4-node LangGraph with parallel execution and automated review. |
| **Debate Arena** | **REAL** | Live multi-round debate with real-time streaming and judge. |
| **Deep Research** | **REAL** | Multi-agent research synthesis with structured reports. |
| **Knowledge RAG** | **REAL** | Real ChromaDB storage, PDF processing, and similarity search. |
| **Task Graph** | **REAL** | Live execution DAG visualizing real-time events from the backend. |
| **Memory Intelligence** | *SIMULATED* | `MemoryPage.tsx` uses static data from `mock-api.ts`. |
| **Self-Reflection Lab**| *SIMULATED* | `ReflectionPage.tsx` uses static data from `mock-api.ts`. |
| **Knowledge Clustering**| *SIMULATED* | The 2D SVG clustering visualization uses pre-defined mock positions. |

---

## Data Flow & State Management

### Backend (LangGraph)
Each agentic pipeline (Coding, Research, Tool Agent) is implemented as a **LangGraph StateGraph**. State is passed between nodes as a `TypedDict` (e.g., `CodingAgentState`, `OrchestratorState`). The `Smart Router` in `smart_orchestrator.py` uses an LLM to classify the task and then executes the appropriate graph, yielding SSE events for real-time tracking.

### Frontend (Zustand & SSE)
**Store**: `frontend/lib/store.ts` | **API**: `frontend/lib/api.ts`
- **State**: Zustand manages chat history, active mode, and the `graphNodes`/`graphEdges` for visualization.
- **Streaming**: `api.ts` uses `AsyncGenerator` to parse the SSE stream line-by-line.
- **Graph Updates**: `node_update` events from the backend are upserted into the Zustand store, triggering immediate re-renders of the `TaskGraphPage` SVG.
- **Code Sections**: Coding results are streamed semantically (`problem_understanding` → `approach` → `code`), allowing the UI to display the agent's logic before the final code is ready.

---

## API Reference

### SSE Event Types (`SmartSSEEvent`)

| Event Type | Fields | Purpose |
|------------|--------|---------|
| `route` | `path`, `reason` | Informs UI of the selected execution graph. |
| `stage` | `message` | General progress indicator message. |
| `node_update` | `node_id`, `status`, `label`, `output`, `x`, `y` | Updates specific task graph node in the UI. |
| `plan` | `subtasks` | Provides the decomposition plan (IDs and descriptions). |
| `code_section` | `section`, `content` | Streams semantic chunks of code generation. |
| `final` | `result`, `meta` | Delivers the final synthesis and metadata (confidence, tools used). |
| `done` | - | Signals the end of the SSE stream. |
| `error` | `message` | Signals an execution error. |

---

## Configuration

### Environment Variables

**Backend (`backend/.env`)**:
```bash
GROQ_API_KEY=gsk_...
```

**Frontend (`frontend/.env.local`)**:
```bash
VITE_API_URL=http://localhost:8000
```

### LLM Setup (`backend/llm_engine.py`)
- **Primary**: `openai/gpt-oss-20b` (via Groq)
- **Large Context/Complex**: `meta-llama/llama-4-scout-17b-16e-instruct`

---

## Development Notes

### Running the Project

**Backend**:
```bash
cd backend
python -m venv venv
# Activate venv
pip install fastapi uvicorn langchain langchain-groq langgraph groq chromadb sentence-transformers pymupdf python-dotenv
python main.py
```

**Frontend**:
```bash
cd frontend
pnpm install
pnpm dev
```

### Known Limitations
1.  **Auth**: Simple local storage check; no backend authentication.
2.  **Concurrency**: ChromaDB is embedded and single-user.
3.  **PDF Sync**: PDF processing is synchronous within the thread pool, potentially slow for very large files.
4.  **Orchestrator Topology**: Research and Coding topologies are currently fixed (3 agents).

---

**Last Updated**: March 2026
**Version**: 2.4.1 (Autonomous multi-agent update)
