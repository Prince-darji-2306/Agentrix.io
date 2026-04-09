from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from core import get_current_user
from repositories import (
    get_user_history,
    rename_conversation,
    delete_conversation,
    clear_all_history,
    get_conversation_with_messages,
)
from services.memory_service import clear_conversation_memory, get_all_conversations

router = APIRouter(tags=["history"])


class RenameRequest(BaseModel):
    title: str


@router.get("/history")
async def get_history(user_id: str = Depends(get_current_user)):
    """Get all conversations with messages for the authenticated user."""
    try:
        history = await get_user_history(user_id)
        return {"conversations": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/history/{conversation_id}")
async def rename_conv(
    conversation_id: str, req: RenameRequest, user_id: str = Depends(get_current_user)
):
    """Rename a conversation title."""
    try:
        ok = await rename_conversation(conversation_id, user_id, req.title)
        if not ok:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{conversation_id}")
async def delete_conv(conversation_id: str, user_id: str = Depends(get_current_user)):
    """Delete a conversation and all its messages."""
    try:
        ok = await delete_conversation(conversation_id, user_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Conversation not found")
        # Clear from window memory
        clear_conversation_memory(conversation_id)
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history")
async def clear_history(user_id: str = Depends(get_current_user)):
    """Clear all conversation history for the user."""
    try:
        count = await clear_all_history(user_id)
        # Clear all window memories for this user (clear all since all convs deleted)
        all_convs = get_all_conversations()
        for conv_id in all_convs:
            clear_conversation_memory(conv_id)
        return {"status": "ok", "deleted": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{conversation_id}")
async def get_conversation_messages(
    conversation_id: str, user_id: str = Depends(get_current_user)
):
    """Get all messages for a specific conversation."""
    try:
        result = await get_conversation_with_messages(conversation_id, user_id)
        return result
    except ValueError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
