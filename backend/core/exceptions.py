from fastapi import Request
from fastapi.responses import JSONResponse


class DatabaseError(Exception):
    """Raised when a database operation fails."""

    def __init__(self, detail: str = "Database operation failed"):
        self.detail = detail
        super().__init__(self.detail)


class LLMError(Exception):
    """Raised when an LLM call fails."""

    def __init__(self, detail: str = "LLM call failed"):
        self.detail = detail
        super().__init__(self.detail)


class QdrantError(Exception):
    """Raised when a Qdrant operation fails."""

    def __init__(self, detail: str = "Qdrant operation failed"):
        self.detail = detail
        super().__init__(self.detail)


async def database_error_handler(request: Request, exc: DatabaseError):
    """Handle DatabaseError globally."""
    return JSONResponse(status_code=500, content={"detail": f"Database error: {exc.detail}"})


async def llm_error_handler(request: Request, exc: LLMError):
    """Handle LLMError globally."""
    return JSONResponse(status_code=502, content={"detail": f"LLM error: {exc.detail}"})


async def qdrant_error_handler(request: Request, exc: QdrantError):
    """Handle QdrantError globally."""
    return JSONResponse(status_code=502, content={"detail": f"Qdrant error: {exc.detail}"})


async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled exceptions."""
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {str(exc)}"})


def register_exception_handlers(app):
    """Register all custom exception handlers on a FastAPI app."""
    app.add_exception_handler(DatabaseError, database_error_handler)
    app.add_exception_handler(LLMError, llm_error_handler)
    app.add_exception_handler(QdrantError, qdrant_error_handler)
    app.add_exception_handler(Exception, generic_exception_handler)