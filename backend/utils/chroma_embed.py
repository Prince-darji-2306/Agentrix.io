import chromadb

def get_chroma_client():
    return chromadb.Client()

def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection("knowledge_base")