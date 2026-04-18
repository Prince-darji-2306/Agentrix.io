# Agentrix.io

[![Live Demo](https://img.shields.io/badge/Live%20Demo-agentrix--io.vercel.app-blue?style=for-the-badge&logo=vercel)](https://agentrix-io.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Prince--darji--2306%2FAgentrix.io-black?style=for-the-badge&logo=github)](https://github.com/Prince-darji-2306/Agentrix.io)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)

> An intelligent multi-agent AI platform with smart query routing, deep research capabilities, coding agents, and conversational memory.

## What is Agentrix.io?

Agentrix.io is a sophisticated AI platform that **automatically classifies user queries** and routes them to specialized agent pipelines:

| Path | Description |
|------|-------------|
| Standard | Tool-calling agent for general Q&A |
| Deep Research | Multi-perspective research with parallel agents |
| Code | Specialized pipeline for programming tasks |

## Key Features

- **Smart Routing** - AI-powered query classification
- **Deep Research Mode** - Parallel researcher agents with aggregation & critic evaluation
- **Coding Agent** - Plan → Parallel Coders → Aggregate → Review workflow
- **Debate Mode** - Multi-agent debate simulation (Proposer, Critic, Verifier)
- **PDF RAG** - Upload PDFs, automatic chunking & semantic search
- **Conversation Memory** - Persistent history with summarization
- **Real-time Streaming** - SSE streaming for all agent responses
- **Task Graph Visualization** - Visual workflow execution tracking

## Tech Stack

**Backend:**
- FastAPI + Python 3.10+
- LangChain + LangGraph (agent workflows)
- PostgreSQL (conversations) + Qdrant (vector store)
- Groq/OpenAI LLMs
- AutoGen (debate agents)

**Frontend:**
- React 19 + TypeScript
- Vite + TailwindCSS 4
- shadcn/ui + Radix UI
- Zustand (state) + React Router
- @xyflow/react (graph visualization)

## Quick Start

### Prerequisites
- Python 3.10+, Node.js 18+
- PostgreSQL, Qdrant

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with:
# DATABASE_URL, JWT_SECRET, GROQ_API_KEY, QDRANT_URL

uvicorn core.app:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install

# Create .env with: VITE_API_URL=http://localhost:8000

npm run dev
```

## Project Structure

```
Agentrix.io/
├── backend/
│   ├── agents/          # LangGraph workflows (smart_orchestrator, coding, debate, convo)
│   ├── services/        # Business logic (orchestration, memory, RAG)
│   ├── routers/         # FastAPI endpoints (auth, chat, debate, pdf, history)
│   ├── repositories/    # PostgreSQL & Qdrant data access
│   ├── core/            # Config, auth, LLM engine, exceptions
│   └── schemas/         # Pydantic models
├── frontend/
│   ├── components/amcas/pages/  # Chat, Debate, Memory, Reflection, TaskGraph
│   ├── lib/                     # API client, store, utilities
│   └── src/                     # App entry & routing
```

## Core Files

| File | Purpose |
|------|---------|
| `backend/core/app.py` | FastAPI entry point |
| `backend/agents/smart_orchestrator.py` | Query classification |
| `backend/services/smart_orchestrator_service.py` | Main routing logic |
| `backend/routers/chat_router.py` | Chat/deep research/code endpoints |
| `frontend/lib/api.ts` | API client + SSE handling |
| `frontend/lib/store.ts` | Zustand state management |

## Environment Variables

**Backend `.env`:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
GROQ_API_KEY=your-groq-key
QDRANT_URL=http://localhost:6333
QDRANT_CLIENT=qdrant_client.QdrantClient(url=QDRANT_URL)
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:8000
```

## API Overview

```
POST   /auth/register          # Register
POST   /auth/login             # Login (returns JWT)
POST   /chat/stream            # Standard chat (SSE)
POST   /deep_research/task     # Deep research (SSE)
POST   /code/agent/stream      # Coding agent (SSE)
POST   /smart-orchestrator/stream  # Smart routing (SSE)
GET    /debate/stream         # Debate (SSE)
GET    /history/conversations # List conversations
POST   /upload-pdf            # Upload PDF
GET    /admin/metrics         # System metrics
```

## Deployment

**Docker:**
```bash
cd backend
docker build -t agentrix-backend .
docker run -p 7860:7860 --env-file .env agentrix-backend
```

**Frontend (Vercel):**
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

## Links

- **Live Demo:** [https://agentrix-io.vercel.app/](https://agentrix-io.vercel.app/)
- **GitHub:** [https://github.com/Prince-darji-2306/Agentrix.io](https://github.com/Prince-darji-2306/Agentrix.io)

---

MIT License
