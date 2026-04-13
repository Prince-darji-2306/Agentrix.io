from core.llm_engine import get_llm
from core.config import AgentConfig
from langchain_core.messages import HumanMessage, SystemMessage
from utils.graph_nodes import get_standard_node_coords, get_deep_research_node_coords


# ─── Node Coordinates for Standard & Deep Research Paths ──────────────────────

STANDARD_NODE_COORDS = get_standard_node_coords()
DEEP_RESEARCH_NODE_COORDS = get_deep_research_node_coords()


def get_standard_node_coords() -> dict:
    """Return node coordinates for the standard path."""
    return STANDARD_NODE_COORDS


def get_deep_research_node_coords() -> dict:
    """Return node coordinates for the deep research path."""
    return DEEP_RESEARCH_NODE_COORDS


# ─── Query Classifier ─────────────────────────────────────────────────────────

async def classify_query(task: str) -> tuple[str, str, str]:
    """Classify the task into one of three paths and return problem understanding for code tasks."""
    llm = get_llm(temperature=AgentConfig.SmartOrchestrator.ROUTER_TEMPERATURE, instant=True)

    prompt = f"""You are a query router. Classify the following user query into exactly one category.

        Query: {task}

        Categories:
        - standard: Simple factual as well as the Detailed questions, greetings, quick calculations, single-step as well as multi step tasks. Use this In most of normal QA.
        - deep_research: Questions requiring very hard multi-perspective research, analysis, comparisons, explanations of complex topics, if the topic needs very good research then select this mode.
        - code: Requests to write, implement, debug, or generate code, algorithms, data structures

        Respond in EXACTLY this format:
        PATH: [standard|deep_research|code]
        UNDERSTANDING: [If PATH is code, provide a brief 2-3 sentence problem understanding explaining what the problem asks for and what the expected solution should look like. If PATH is not code, write "N/A"]
        REASON: [brief explanation of why this path was chosen]"""

    response = await llm.ainvoke([
        SystemMessage(content="You are a query classifier. Output only the specified format."),
        HumanMessage(content=prompt),
    ])

    content = response.content.strip()
    path = "standard"
    reason = "Default classification"
    problem_understanding = "N/A"

    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("PATH:"):
            extracted = line.split(":")[1].strip().lower()
            if extracted in ("standard", "deep_research", "code"):
                path = extracted
        elif line.startswith("UNDERSTANDING:"):
            problem_understanding = line.split(":", 1)[1].strip()
        elif line.startswith("REASON:"):
            reason = line.split(":", 1)[1].strip()

    return path, reason, problem_understanding