import os
import chromadb
from chromadb.utils import embedding_functions

def get_chroma_client():
    # Use persistent client so data is saved to disk
    persist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_storage")
    return chromadb.PersistentClient(path=persist_dir)

def get_collection():
    client = get_chroma_client()
    # Use default embedding function or specify one as needed
    emb_fn = embedding_functions.DefaultEmbeddingFunction()
    return client.get_or_create_collection("knowledge_base", embedding_function=emb_fn)