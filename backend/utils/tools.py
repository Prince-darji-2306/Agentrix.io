import math
import datetime
from langchain_core.tools import tool
from utils.chroma_embed import get_collection

@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression. Use for arithmetic, algebra, geometry calculations."""
    try:
        # Safe eval with math functions
        allowed = {k: getattr(math, k) for k in dir(math) if not k.startswith("_")}
        allowed.update({"abs": abs, "round": round, "pow": pow})
        result = eval(expression, {"__builtins__": {}}, allowed)
        return f"Result: {result}"
    except Exception as e:
        return f"Calculation error: {str(e)}"

@tool
def knowledge_retriever(query: str) -> str:
    """Retrieve relevant information from the knowledge base using ChromaDB. Use for factual questions."""
    try:
        collection = get_collection()
        results = collection.query(query_texts=[query], n_results=3)
        docs = results.get("documents")[0]
        if docs:
            return "Retrieved knowledge:\n" + "\n".join(f"- {d}" for d in docs)
        return "No relevant knowledge found in database."
    except Exception as e:
        return f"Retrieval error: {str(e)}"

@tool
def get_current_datetime(timezone: str = "UTC") -> str:
    """Get the current date and time. Use when user asks about current time or date."""
    now = datetime.datetime.utcnow()
    return f"Current UTC datetime: {now.strftime('%Y-%m-%d %H:%M:%S')}"


def get_tools_list():
    return [calculator, knowledge_retriever, get_current_datetime]

def get_tools_map():
    return {t.name: t for t in get_tools_list()}
