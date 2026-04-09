import operator
from pydantic import BaseModel
from langchain_core.messages import BaseMessage
from typing import TypedDict, Annotated, Sequence, List, Optional, Callable

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str

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
    serious_mistakes: List[dict]

class CodeModeState(TypedDict):
    original_task: str
    plan: str
    code_results: List[dict]  # [{agent_id, code}]
    final_code: str
    review_feedback: str
    confidence_score: int
    consistency_score: int
    step_logs: List[str]
    serious_mistakes: List[dict]
    graph_nodes: List[dict]
    graph_edges: List[dict]


class SmartOrchestratorRequest(BaseModel):
    task: str


class CodingSubtask(TypedDict):
    id: int
    description: str
    signatures: List[str]
    result: Optional[str]


class CodingAgentState(TypedDict):
    original_task: str
    subtasks: List[CodingSubtask]
    shared_contract: str
    coder_results: List[str]
    merged_code: str
    review_errors: List[str]
    retry_count: int
    confidence_score: int
    logical_consistency: int
    critic_feedback: str
    final_output: str
    parsed_files: List[dict]   # [{"filename": str, "content": str, "language": str}]
    step_logs: List[str]

