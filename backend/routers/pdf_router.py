import os
import shutil
import tempfile
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from core import get_current_user
from utils.pdf_processor import process_pdfs
from repositories import create_conversation, update_conversation_timestamp, get_user_pdf_summaries, get_pdf_quality_scores

router = APIRouter(tags=["pdf"])


@router.post("/upload-pdf")
async def upload_pdfs(
    files: list[UploadFile] = File(...),
    conversation_id: str | None = None,
    user_id: str = Depends(get_current_user),
):
    """
    Accepts multiple PDF files, saves them temporarily,
    processes them through pdf_processor, and stores in Qdrant.
    """
    temp_dir = tempfile.mkdtemp()
    file_paths = []

    try:
        for file in files:
            if not file.filename:
                continue
            temp_path = os.path.join(temp_dir, file.filename)
            with open(temp_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            file_paths.append(temp_path)

        conv_id = conversation_id
        if not conv_id:
            conv_id = await create_conversation(user_id, "standard", f"PDF Upload: {len(files)} file(s)")
        
        results = await process_pdfs(file_paths, user_id, conversation_id=conv_id)
        await update_conversation_timestamp(conv_id)

        return {
            "status": "success",
            "processed": results.get("total_chunks", 0),
            "details": results,
            "conversation_id": conv_id,
        }
    except Exception as e:
        print(f"[pdf_router] PDF processing error: {e}")
        return {
            "status": "partial",
            "processed": 0,
            "details": {"error": str(e), "note": "Qdrant may be unavailable. PDFs processed but not stored."},
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.get("/memory/pdfs")
async def get_memory_pdfs(user_id: str = Depends(get_current_user)):
    """Get all PDF summaries for the authenticated user."""
    try:
        summaries = get_user_pdf_summaries(user_id)
        
        if summaries:
            pdf_ids = [s.get("pdf_id") for s in summaries if s.get("pdf_id")]
            if pdf_ids:
                scores = await get_pdf_quality_scores(pdf_ids)
                for s in summaries:
                    pid = s.get("pdf_id")
                    if pid and pid in scores:
                        # Normalize to a percentage if it's cosine similarity (-1 to 1 or 0 to 1)
                        # We'll just pass it as is or multiply by 100 on the frontend, let's keep it 0-100 format if it was 0-1
                        # If average similarity is 0.85, maybe we want it as 85.
                        avg = scores[pid]
                        s["quality_score"] = int(avg * 100) if 0 <= avg <= 1 else int(avg)

        return {"pdfs": summaries}
    except Exception as e:
        print(f"[pdf_router] Qdrant unavailable, returning empty list: {e}")
        return {"pdfs": []}
