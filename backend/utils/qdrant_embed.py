# Thin wrapper — re-exports from repositories/qdrant_repo.py
from repositories.qdrant_repo import (  # noqa: F401
    get_embedding,
    get_qdrant_client,
    init_qdrant_collections,
    search_chunks,
    upsert_pdf_chunks,
    upsert_pdf_summary,
    get_user_pdf_summaries,
    search_pdf_summary,
    search_chunks_by_pdf_id,
    get_pdf_ids_by_names,
    get_most_recent_pdf_id,
)