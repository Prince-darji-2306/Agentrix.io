"""
Centralized configuration module for LLM parameters, scoring, and constants.

Provides single source of truth for:
- LLM temperature profiles for different use cases
- Scoring and confidence thresholds
- Valid severity levels for mistakes/issues
- Graph node coordinates (eventually)
- Agent-specific parameters

Usage:
    from core.config import LLMConfig, ScoringConfig
    
    llm = get_llm(temperature=LLMConfig.PRECISE)
    score = clamp_score(value, default=ScoringConfig.DEFAULT)
"""


class LLMConfig:
    """
    LLM temperature profiles for different use cases.
    
    Temperature controls randomness: 0 = deterministic, 1 = highly random.
    - Structured: Planning, routing, critics (need precision)
    - Precise: Code generation, technical writing (mostly deterministic)
    - Balanced: Research, analysis, general reasoning (mix of precision & exploration)
    - Creative: Brainstorming, alternatives (high exploration)
    """
    # Planning & Decision Making (deterministic)
    STRUCTURED = 0.0
    
    # Code & Technical Output (precise but not rigid)
    PRECISE = 0.1
    
    # Research & Analysis (balanced exploration + precision)
    BALANCED = 0.3
    
    # Brainstorming & Alternatives (exploratory)
    CREATIVE = 0.7


class ScoringConfig:
    """
    Configuration for confidence and consistency scoring.
    
    Used for evaluating LLM output quality:
    - Range: [MIN, MAX]
    - Default: Used as fallback when parsing fails
    """
    MIN = 0
    MAX = 100
    DEFAULT = 50
    
    # Quality thresholds for evaluation feedback
    POOR_THRESHOLD = 39        # 0-39: poor quality, requires rework
    PARTIAL_THRESHOLD = 69     # 40-69: partial quality, has gaps
    GOOD_THRESHOLD = 89        # 70-89: good quality, manageable issues
    # 90-100: excellent quality, production-ready


class SeverityConfig:
    """
    Valid severity levels for mistakes/issues found in LLM output.
    
    Used for categorizing problems:
    - low: Minor issues, cosmetic
    - medium: Moderate issues, affects usability
    - high: Significant issues, affects correctness
    - critical: Breaking issues, prevents function
    """
    VALID_LEVELS = {"low", "medium", "high", "critical"}
    DEFAULT = "high"


class CriticConfig:
    """
    Configuration for critic/reviewer agents.
    
    Used when evaluating LLM-generated code, research, or other output.
    """
    # Default confidence score when parsing fails
    PARSE_ERROR_CONFIDENCE = 25
    PARSE_ERROR_CONSISTENCY = 25
    
    # Default confidence score when parsing succeeds
    SUCCESS_BASELINE_CONFIDENCE = 70
    SUCCESS_BASELINE_CONSISTENCY = 70


class AgentConfig:
    """
    Agent-specific configuration and parameters.
    """
    
    class CodingAgent:
        """Code generation and review agent configuration."""
        # Temperature for planning/routing decisions
        PLANNER_TEMPERATURE = LLMConfig.PRECISE
        
        # Temperature for parallel code generation
        CODER_TEMPERATURE = LLMConfig.PRECISE
        
        # Temperature for code merging/aggregation
        AGGREGATOR_TEMPERATURE = LLMConfig.PRECISE
        
        # Temperature for code review/criticism
        REVIEWER_TEMPERATURE = LLMConfig.STRUCTURED
    
    class OrchestratorAgent:
        """Deep research orchestrator agent configuration."""
        # Temperature for research decomposition
        DECOMPOSER_TEMPERATURE = LLMConfig.BALANCED
        
        # Temperature for researcher agents
        RESEARCHER_TEMPERATURE = LLMConfig.CREATIVE
        
        # Temperature for research aggregation
        AGGREGATOR_TEMPERATURE = LLMConfig.BALANCED
        
        # Temperature for research quality criticism
        CRITIC_TEMPERATURE = LLMConfig.STRUCTURED
    
    class SmartOrchestrator:
        """Smart routing orchestrator configuration."""
        # Temperature for query classification and routing
        ROUTER_TEMPERATURE = LLMConfig.STRUCTURED
