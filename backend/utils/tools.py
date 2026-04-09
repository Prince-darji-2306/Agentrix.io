import asyncio
import math
import datetime
from langchain_core.tools import tool
from utils.qdrant_embed import search_chunks, search_chunks_by_pdf_id, get_most_recent_pdf_id

# Per-request user_id injected by agent_service before each tool-agent invocation.
CURRENT_USER_ID: str = "default_user"

# Accumulator: every chunk retrieved in this request is appended here.
# agent_service reads this after graph.invoke() to log them with the real message_id.
RETRIEVED_CHUNKS_BUFFER: list[dict] = []


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression. Use for arithmetic, algebra, geometry calculations."""
    try:
        allowed = {k: getattr(math, k) for k in dir(math) if not k.startswith("_")}
        allowed.update({"abs": abs, "round": round, "pow": pow})
        result = eval(expression, {"__builtins__": {}}, allowed)
        return f"Result: {result}"
    except Exception as e:
        return f"Calculation error: {str(e)}"

@tool
def knowledge_retriever(query: str, pdf_id: str = "", mode: str = "all") -> str:
    """Retrieve relevant information from the knowledge base (Qdrant vector store).

    Use this tool to answer questions about uploaded documents or any factual queries.

    Args:
        query:  The search query — describe what information you need.
        pdf_id: Optional. If a specific document ID is provided, retrieve ONLY from
                that document.
        mode:   Optional. "all" = search all user documents, "last" = search only the
                most recently uploaded document. Default is "all".
    """
    try:
        if pdf_id:
            chunks = search_chunks_by_pdf_id(query, user_id=CURRENT_USER_ID, pdf_id=pdf_id, top_k=5)
        elif mode == "last":
            # Get most recently uploaded PDF for user
            latest_pdf_id = get_most_recent_pdf_id(CURRENT_USER_ID)
            if latest_pdf_id:
                chunks = search_chunks_by_pdf_id(query, user_id=CURRENT_USER_ID, pdf_id=latest_pdf_id, top_k=5)
            else:
                return "No documents have been uploaded yet. Please upload a PDF first."
        else:
            # mode == "all" - search all user documents
            chunks = search_chunks(query, user_id=CURRENT_USER_ID, top_k=3)

        if chunks:
            # Buffer the chunks — agent_service will log them after append_message
            # gives us the real message_id (FK to messages table).
            RETRIEVED_CHUNKS_BUFFER.extend(chunks)

            results = []
            for c in chunks:
                page = f"page {c['page_number']}" if c.get("page_number") else "unknown page"
                results.append(
                    f"[{c['doc_name']} | {page} | relevance: {c['similarity_score']:.2f}]\n"
                    f"{c['text_content']}"
                )
            return "Retrieved knowledge:\n\n" + "\n\n---\n\n".join(results)

        if pdf_id:
            return f"No content found in the specified document (pdf_id={pdf_id}) for this query."
        return "No relevant knowledge found in the knowledge base for this query."

    except Exception as e:
        print(f"[knowledge_retriever] Error: {e}")
        return "Knowledge base is currently unavailable. Please answer from your general knowledge."


@tool
def get_current_datetime(timezone: str = "UTC") -> str:
    """Get the current date and time. Use when user asks about current time or date."""
    now = datetime.datetime.utcnow()
    return f"Current UTC datetime: {now.strftime('%Y-%m-%d %H:%M:%S')}"


def get_tools_list():
    return [calculator, knowledge_retriever, get_current_datetime]


def get_tools_map():
    return {t.name: t for t in get_tools_list()}
