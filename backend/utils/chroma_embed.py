import os
import chromadb
from chromadb.utils import embedding_functions

# Cache the embedding model at module level to avoid reloading
_embedding_model_cache = None

def get_model():
    """Get cached embedding model or create new one if not cached."""
    global _embedding_model_cache
    if _embedding_model_cache is None:
        _embedding_model_cache = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="BAAI/bge-small-en-v1.5"
        )
    return _embedding_model_cache

def get_chroma_client():
    # Use persistent client so data is saved to disk
    persist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_storage")
    return chromadb.PersistentClient(path=persist_dir)

def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection("knowledge_base", embedding_function=get_model())