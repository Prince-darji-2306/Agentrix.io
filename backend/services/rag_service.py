"""
PDF Context Resolver (rag_service.py)
======================================
Determines *which* PDF (if any) is relevant to a user query.
Returns a pdf_id string or None — the actual answering is done by run_tool_agent.

Classification Flow
-------------------
1. If explicit pdf_names were passed (files attached to the message):
   → Resolve to pdf_id directly (skip classification).

2. Otherwise, ask the LLM to classify the query into one of two classes:
   - "last" : The user explicitly references "this pdf / this resume / this document /
               the uploaded file" — i.e., they mean whatever was most recently uploaded.
   - "try"  : Any other query. We'll attempt a cosine similarity search on pdf_summary
               to see if any stored PDF is relevant (score threshold: 0.6).

3. Based on class:
   - "last" → Return pdf_id of the most recently uploaded PDF (by created_at).
   - "try"  → Run cosine similarity on pdf_summary; return best match pdf_id if ≥ 0.6,
               otherwise return None (no PDF context needed).
"""

from core.llm_engine import get_llm
from repositories import (
    search_pdf_summary,
    get_pdf_ids_by_names,
    get_most_recent_pdf_id,
)
from langchain_core.messages import HumanMessage, SystemMessage

# Minimum similarity score to consider a PDF relevant under "try" class
PDF_SIMILARITY_THRESHOLD = 0.6

# ─── LLM Classification Prompt ────────────────────────────────────────────────

_CLASSIFIER_SYSTEM = """You are a query classifier. Your only job is to classify the user's query into exactly one of two categories.

Categories:
- "last"  → The user is explicitly referring to a specific uploaded document using phrases like:
             "this pdf", "this resume", "this cv", "this document", "this file", "the uploaded pdf",
             "above resume", "this report", "explain this", "analyze this", "what is in this".
             Any query where "this" clearly refers to an uploaded file = "last".

- "try"   → All other queries. This includes general knowledge questions, coding questions,
             math, current events, or any question that does NOT explicitly point to an uploaded file.

Rules:
- Respond with ONLY the single word: last  OR  try
- No punctuation, no explanation, no other words.
- If unsure, default to "try"."""


async def run_smart_chat(
    query: str,
    user_id: str,
    pdf_names: list[str] | None = None,
) -> str | None:
    """
    Classify the query and resolve the correct pdf_id to use for retrieval.

    Returns:
        str  — a pdf_id if a relevant PDF was found
        None — if no PDF context is applicable (general question)
    """

    # ── Step 1: Explicit pdf_names attached to this message ───────────────────
    # If the frontend sent pdf file names, the user is clearly working with those PDFs.
    # Skip classification entirely and resolve the pdf_id directly.
    if pdf_names:
        try:
            name_to_id = get_pdf_ids_by_names(pdf_names, user_id)
            for name in pdf_names:
                pid = name_to_id.get(name)
                if pid:
                    print(f"[rag_service] Explicit PDF match: '{name}' → pdf_id={pid}")
                    return pid
        except Exception as e:
            print(f"[rag_service] Name lookup failed: {e}")
        # If names were provided but none resolved (e.g. Qdrant lag), fall through to classify

    # ── Step 2: LLM Classification ────────────────────────────────────────────
    llm = get_llm(instant=True)  # llama-4-scout — fast, accurate for classification
    try:
        response = await llm.ainvoke([
            SystemMessage(content=_CLASSIFIER_SYSTEM),
            HumanMessage(content=query),
        ])
        classification = response.content.strip().lower().replace('"', "").replace("'", "")
        print(f"[rag_service] Query classified as: '{classification}' | query='{query[:60]}'")
    except Exception as e:
        print(f"[rag_service] Classification failed: {e} — defaulting to 'try'")
        classification = "try"

    # ── Step 3: Resolve pdf_id based on class ─────────────────────────────────

    if classification == "last":
        # User is referring to their most recently uploaded PDF
        try:
            pdf_id = get_most_recent_pdf_id(user_id)
            if pdf_id:
                print(f"[rag_service] 'last' class → using most recent pdf_id={pdf_id}")
            else:
                print(f"[rag_service] 'last' class but no PDFs found for user={user_id}")
            return pdf_id
        except Exception as e:
            print(f"[rag_service] get_most_recent_pdf_id failed: {e}")
            return None

    else:
        # "try" — attempt cosine similarity on pdf_summary
        try:
            summaries = search_pdf_summary(query, user_id, top_k=3)
            for s in summaries:
                if s["similarity_score"] >= PDF_SIMILARITY_THRESHOLD:
                    print(
                        f"[rag_service] 'try' class → similarity match '{s['doc_name']}' "
                        f"(score={s['similarity_score']:.3f}) → pdf_id={s['pdf_id']}"
                    )
                    return s["pdf_id"]
            # No match above threshold
            print(f"[rag_service] 'try' class → no PDF similarity match (best < {PDF_SIMILARITY_THRESHOLD})")
            return None
        except Exception as e:
            print(f"[rag_service] pdf_summary search failed: {e}")
            return None
