import concurrent.futures
import os
import uuid
import fitz  # PyMuPDF
from langchain.text_splitter import RecursiveCharacterTextSplitter
from core.llm_engine import get_llm
from langchain_core.messages import HumanMessage


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


def extract_pages_from_pdf(file_path: str) -> list[dict]:
    """Extract text from a PDF, returning a list of {page_number, text} dicts."""
    pages = []
    try:
        with fitz.open(file_path) as doc:
            for i, page in enumerate(doc):
                page_text = page.get_text()
                if page_text.strip():
                    pages.append({"page_number": i + 1, "text": page_text})
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return pages


def chunk_pages(pages: list[dict], chunk_size: int = 500, chunk_overlap: int = 80) -> list[dict]:
    """Split pages into chunks, preserving page_number metadata."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    chunks = []
    chunk_index = 0
    for page in pages:
        page_chunks = text_splitter.split_text(page["text"])
        for text in page_chunks:
            chunks.append({
                "page_number": page["page_number"],
                "chunk_index": chunk_index,
                "text_content": text,
            })
            chunk_index += 1
    return chunks


async def generate_pdf_summary(text: str, doc_name: str) -> tuple[str, list[str]]:
    """Use LLM to generate a summary and topic tags for a PDF document."""
    llm = get_llm(temperature=0.2, change=True)

    prompt = f"""You are a document analyst. Given the following extracted text from a PDF named "{doc_name}", produce:

1. A concise 2-3 sentence summary of the document's main topic and key content.
2. A list of 3-5 topic tags (single words or short phrases) that categorize this document.

Respond in EXACTLY this format:
SUMMARY: [your summary here]
TAGS: [tag1], [tag2], [tag3], ...

Document text (first 3000 chars):
{text[:3000]}"""

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    content = response.content.strip()

    summary = ""
    tags: list[str] = []

    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("SUMMARY:"):
            summary = line.split(":", 1)[1].strip()
        elif line.startswith("TAGS:"):
            tags_str = line.split(":", 1)[1].strip()
            tags = [t.strip() for t in tags_str.split(",") if t.strip()]

    if not summary:
        summary = f"Document: {doc_name}"

    return summary, tags


def process_single_pdf(file_path: str, user_id: str) -> dict:
    """Extract text and chunk a single PDF. Returns {chunks, full_text, doc_name}."""
    full_text = extract_text_from_pdf(file_path)
    if not full_text.strip():
        return {"chunks": [], "full_text": "", "doc_name": os.path.basename(file_path)}

    pages = extract_pages_from_pdf(file_path)
    chunks = chunk_pages(pages)

    return {
        "chunks": chunks,
        "full_text": full_text,
        "doc_name": os.path.basename(file_path),
    }


async def process_pdfs(file_paths: list[str], user_id: str, conversation_id: str | None = None) -> dict:
    """
    Multithreaded processing for multiple PDFs.
    1. Extracts text and chunks in parallel
    2. Generates LLM summaries
    3. Stores in Qdrant (pdf_summary + pdf_chunks collections)
    Returns a dict with total chunks processed and details per file.
    """
    from utils.qdrant_embed import upsert_pdf_summary, upsert_pdf_chunks

    results = {"total_chunks": 0, "files": {}}
    processed_docs = []

    # Use ThreadPoolExecutor for concurrent parsing and chunking
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_pdf = {executor.submit(process_single_pdf, path, user_id): path for path in file_paths}

        for future in concurrent.futures.as_completed(future_to_pdf):
            path = future_to_pdf[future]
            try:
                doc_data = future.result()
                filename = doc_data["doc_name"]
                results["files"][filename] = len(doc_data["chunks"])
                results["total_chunks"] += len(doc_data["chunks"])
                processed_docs.append(doc_data)
            except Exception as exc:
                print(f'{path} generated an exception: {exc}')
                results["files"][os.path.basename(path)] = 0

    # Generate summaries and store in Qdrant
    for doc_data in processed_docs:
        pdf_id = str(uuid.uuid4())
        doc_name = doc_data["doc_name"]
        full_text = doc_data["full_text"]
        chunks = doc_data["chunks"]

        # Generate LLM summary
        try:
            summary, topic_tags = await generate_pdf_summary(full_text, doc_name)
        except Exception as e:
            print(f"Summary generation failed for {doc_name}: {e}")
            summary = f"Document: {doc_name}"
            topic_tags = []

        # Store summary in Qdrant
        try:
            upsert_pdf_summary(
                pdf_id=pdf_id,
                user_id=user_id,
                conversation_id=conversation_id,
                doc_name=doc_name,
                doc_summary=summary,
                topic_tags=topic_tags,
            )
        except Exception as e:
            print(f"Failed to store summary for {doc_name}: {e}")

        # Store chunks in Qdrant
        if chunks:
            try:
                chunk_count = upsert_pdf_chunks(
                    pdf_id=pdf_id,
                    user_id=user_id,
                    doc_name=doc_name,
                    chunks=chunks,
                )
                print(f"[pdf_processor] Stored {chunk_count} chunks for {doc_name}")
            except Exception as e:
                print(f"Failed to store chunks for {doc_name}: {e}")

    return results