"""
One-off script to create the missing pdf_id payload index on the pdf_chunks collection.
Run this once from the backend directory: python create_pdf_id_index.py
"""
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import PayloadSchemaType

load_dotenv()

client = QdrantClient(
    url=os.getenv("QDRANT_CLIENT"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

try:
    client.create_payload_index(
        collection_name="pdf_chunks",
        field_name="pdf_id",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    print("[OK] Created 'pdf_id' keyword index on 'pdf_chunks' collection.")
except Exception as e:
    print(f"[INFO] Index creation result: {e}")
    print("(If this says 'already exists', the index was already created — you're good!)")
