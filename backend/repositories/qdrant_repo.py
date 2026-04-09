import os
import time
import uuid
from typing import List

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)
from sentence_transformers import SentenceTransformer

load_dotenv()

# ─── Embedding Model (cached) ─────────────────────────────────────────────────

_embedding_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    """Get cached SentenceTransformer model."""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _embedding_model


def get_embedding(text: str) -> list[float]:
    """Generate a 384-dim embedding for the given text."""
    model = get_embedding_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


# ─── Qdrant Client ────────────────────────────────────────────────────────────

_qdrant_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    """Get the global Qdrant client singleton."""
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(
            url=os.getenv("QDRANT_CLIENT"),
            api_key=os.getenv("QDRANT_API_KEY"),
        )
    return _qdrant_client


def init_qdrant_collections():
    """Create pdf_summary and pdf_chunks collections if they don't exist."""
    client = get_qdrant_client()
    collections = [c.name for c in client.get_collections().collections]

    if "pdf_summary" not in collections:
        client.create_collection(
            collection_name="pdf_summary",
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        print("[qdrant] Created 'pdf_summary' collection.")

    try:
        client.create_payload_index(
            collection_name="pdf_summary",
            field_name="user_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        print("[qdrant] Created 'user_id' index on 'pdf_summary'.")
    except Exception:
        pass

    if "pdf_chunks" not in collections:
        client.create_collection(
            collection_name="pdf_chunks",
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        print("[qdrant] Created 'pdf_chunks' collection.")

    try:
        client.create_payload_index(
            collection_name="pdf_chunks",
            field_name="user_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        print("[qdrant] Created 'user_id' index on 'pdf_chunks'.")
    except Exception:
        pass

    # pdf_id index is required for filtering chunks by a specific PDF
    try:
        client.create_payload_index(
            collection_name="pdf_chunks",
            field_name="pdf_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        print("[qdrant] Created 'pdf_id' index on 'pdf_chunks'.")
    except Exception:
        pass


# ─── PDF Summary CRUD ─────────────────────────────────────────────────────────

def upsert_pdf_summary(
    pdf_id: str,
    user_id: str,
    conversation_id: str | None,
    doc_name: str,
    doc_summary: str,
    topic_tags: list[str],
) -> str:
    """Store a PDF summary in the pdf_summary collection. Returns the point ID."""
    client = get_qdrant_client()
    embedding = get_embedding(doc_summary)

    point_id = str(uuid.uuid4())
    payload = {
        "pdf_id": pdf_id,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "doc_name": doc_name,
        "doc_summary": doc_summary,
        "topic_tags": topic_tags,
        "created_at": time.time(),  # Unix timestamp — used to find the most recently uploaded PDF
    }

    client.upsert(
        collection_name="pdf_summary",
        points=[PointStruct(id=point_id, vector=embedding, payload=payload)],
    )
    return point_id


def get_user_pdf_summaries(user_id: str) -> list[dict]:
    """Get all PDF summaries for a given user."""
    client = get_qdrant_client()

    results = client.scroll(
        collection_name="pdf_summary",
        scroll_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=100,
    )

    summaries = []
    for point in results[0]:
        summaries.append({
            "id": str(point.id),
            "pdf_id": point.payload.get("pdf_id"),
            "doc_name": point.payload.get("doc_name"),
            "doc_summary": point.payload.get("doc_summary"),
            "topic_tags": point.payload.get("topic_tags", []),
            "user_id": point.payload.get("user_id"),
            "conversation_id": point.payload.get("conversation_id"),
        })
    return summaries


# ─── PDF Chunks CRUD ──────────────────────────────────────────────────────────

def upsert_pdf_chunks(
    pdf_id: str,
    user_id: str,
    doc_name: str,
    chunks: list[dict],
) -> int:
    """
    Store PDF chunks in the pdf_chunks collection.
    Each chunk dict should have: page_number, chunk_index, text_content.
    Returns the number of chunks stored.
    """
    client = get_qdrant_client()

    points = []
    for chunk in chunks:
        embedding = get_embedding(chunk["text_content"])
        point_id = str(uuid.uuid4())
        payload = {
            "pdf_id": pdf_id,
            "user_id": user_id,
            "doc_name": doc_name,
            "page_number": chunk.get("page_number", 0),
            "chunk_index": chunk.get("chunk_index", 0),
            "text_content": chunk["text_content"],
        }
        points.append(PointStruct(id=point_id, vector=embedding, payload=payload))

    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        client.upsert(collection_name="pdf_chunks", points=batch)

    return len(points)


def search_chunks(query: str, user_id: str, top_k: int = 3) -> list[dict]:
    """Search for relevant chunks filtered by user_id."""
    client = get_qdrant_client()
    embedding = get_embedding(query)

    results = client.query_points(
        collection_name="pdf_chunks",
        query=embedding,
        query_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=top_k,
        with_payload=True,
    )

    chunks = []
    for hit in results.points:
        chunks.append({
            "id": str(hit.id),
            "text_content": hit.payload.get("text_content", ""),
            "pdf_id": hit.payload.get("pdf_id"),
            "doc_name": hit.payload.get("doc_name"),
            "page_number": hit.payload.get("page_number"),
            "similarity_score": hit.score,
        })
    return chunks


def search_pdf_summary(query: str, user_id: str, top_k: int = 3) -> list[dict]:
    """Search pdf_summary collection by query similarity for a given user.
    Returns list of {pdf_id, doc_name, doc_summary, similarity_score}.
    """
    client = get_qdrant_client()
    embedding = get_embedding(query)

    results = client.query_points(
        collection_name="pdf_summary",
        query=embedding,
        query_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=top_k,
        with_payload=True,
    )

    summaries = []
    for hit in results.points:
        summaries.append({
            "id": str(hit.id),
            "pdf_id": hit.payload.get("pdf_id"),
            "doc_name": hit.payload.get("doc_name"),
            "doc_summary": hit.payload.get("doc_summary"),
            "topic_tags": hit.payload.get("topic_tags", []),
            "similarity_score": hit.score,
        })
    return summaries


def search_chunks_by_pdf_id(query: str, user_id: str, pdf_id: str, top_k: int = 5) -> list[dict]:
    """Search pdf_chunks filtered by a specific pdf_id. Returns the most relevant chunks."""
    client = get_qdrant_client()
    embedding = get_embedding(query)

    results = client.query_points(
        collection_name="pdf_chunks",
        query=embedding,
        query_filter=Filter(
            must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                FieldCondition(key="pdf_id", match=MatchValue(value=pdf_id)),
            ]
        ),
        limit=top_k,
        with_payload=True,
    )

    chunks = []
    for hit in results.points:
        chunks.append({
            "id": str(hit.id),
            "text_content": hit.payload.get("text_content", ""),
            "pdf_id": hit.payload.get("pdf_id"),
            "doc_name": hit.payload.get("doc_name"),
            "page_number": hit.payload.get("page_number"),
            "similarity_score": hit.score,
        })
    return chunks


def get_pdf_ids_by_names(doc_names: list[str], user_id: str) -> dict[str, str]:
    """Look up pdf_ids by doc_name for a given user. Returns {doc_name: pdf_id}."""
    client = get_qdrant_client()
    result: dict[str, str] = {}

    hits, _ = client.scroll(
        collection_name="pdf_summary",
        scroll_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=200,
        with_payload=True,
    )
    for point in hits:
        name = point.payload.get("doc_name", "")
        if name in doc_names:
            result[name] = point.payload.get("pdf_id", "")

    return result


def get_most_recent_pdf_id(user_id: str) -> str | None:
    """Return the pdf_id of the most recently uploaded PDF for a given user.
    Uses the created_at timestamp stored in the pdf_summary payload.
    Falls back gracefully for older entries that lack the timestamp.
    """
    client = get_qdrant_client()

    hits, _ = client.scroll(
        collection_name="pdf_summary",
        scroll_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=200,
        with_payload=True,
    )
    if not hits:
        return None

    # Sort descending by created_at; entries without the field get 0 (treated as oldest)
    sorted_hits = sorted(hits, key=lambda p: p.payload.get("created_at", 0), reverse=True)
    return sorted_hits[0].payload.get("pdf_id")