import concurrent.futures
import os
import uuid
import fitz  # PyMuPDF
from langchain.text_splitter import RecursiveCharacterTextSplitter
from .chroma_embed import get_collection

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from a single PDF using PyMuPDF."""
    text = ""
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text() + "\n"
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return text

def process_single_pdf(file_path: str, user_id: str) -> list:
    """Extracts text and chunks it. Returns a list of chunks and their metadata."""
    text = extract_text_from_pdf(file_path)
    if not text.strip():
        return []
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_text(text)
    
    if not chunks:
        return []

    filename = os.path.basename(file_path)
    
    docs = []
    for chunk in chunks:
        docs.append({
            "document": chunk,
            "metadata": {"source": filename, "user_id": user_id},
            "id": str(uuid.uuid4())
        })
        
    return docs

def process_pdfs(file_paths: list[str], user_id: str) -> dict:
    """
    Multithreaded processing for multiple PDFs.
    Returns a dict with total chunks processed and details per file.
    """
    results = {"total_chunks": 0, "files": {}}
    all_docs = []
    
    # Use ThreadPoolExecutor for concurrent parsing and chunking
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_pdf = {executor.submit(process_single_pdf, path, user_id): path for path in file_paths}
        
        for future in concurrent.futures.as_completed(future_to_pdf):
            path = future_to_pdf[future]
            try:
                docs = future.result()
                filename = os.path.basename(path)
                results["files"][filename] = len(docs)
                all_docs.extend(docs)
                results["total_chunks"] += len(docs)
            except Exception as exc:
                print(f'{path} generated an exception: {exc}')
                results["files"][os.path.basename(path)] = 0
                
    # Thread-safe insertion into ChromaDB from main thread
    if all_docs:
        collection = get_collection()
        documents = [d["document"] for d in all_docs]
        metadatas = [d["metadata"] for d in all_docs]
        ids = [d["id"] for d in all_docs]
        
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
                
    return results
