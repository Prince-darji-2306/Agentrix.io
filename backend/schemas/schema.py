import operator
from pydantic import BaseModel
from langchain_core.messages import BaseMessage
from typing import TypedDict, Annotated, Sequence, List


class QueryRequest(BaseModel):
    query: str

class TaskRequest(BaseModel):
    task: str

class DebateRequest(BaseModel):
    topic: str
    rounds: int = 3

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]

class OrchestratorState(TypedDict):
    original_task: str
    subtasks: List[dict]          # [{id, description, agent_type, result}]
    current_subtask_index: int
    final_result: str
    step_logs: List[str]
    critic_confidence: int
    critic_logical_consistency: int
    critic_feedback: str