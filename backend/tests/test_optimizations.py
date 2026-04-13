"""
Unit tests for backend optimization modules.

Tests core functionality of:
- JSON helpers (parsing, normalization)
- Configuration (LLM settings, scoring)
- Context injection (memory handling)
- SSE streaming (event formatting)
- Graph nodes (coordinate definitions)
"""

import pytest
import json
from utils.json_helpers import (
    sanitize_fenced_json,
    extract_first_json_object,
    load_json_object,
    clamp_score,
    normalize_text,
    normalize_errors,
    normalize_serious_mistakes,
)
from core.config import LLMConfig, ScoringConfig, SeverityConfig, AgentConfig
from services.context_injector import inject_memory_context, has_memory_context
from services.base_stream_service import format_sse_event, create_sse_event
from utils.graph_nodes import (
    get_coding_node_coords,
    get_deep_research_node_coords,
    get_standard_node_coords,
)


# ─── JSON Helpers Tests ────────────────────────────────────────────────────────

class TestJsonHelpers:
    """Tests for JSON parsing and normalization utilities."""
    
    def test_sanitize_fenced_json_with_backticks(self):
        """Test removal of markdown code fences."""
        raw = "```json\n{\"key\": \"value\"}\n```"
        result = sanitize_fenced_json(raw)
        assert result == "{\"key\": \"value\"}"
    
    def test_sanitize_fenced_json_with_plain_backticks(self):
        """Test removal of plain backticks."""
        raw = "```\n{\"key\": \"value\"}\n```"
        result = sanitize_fenced_json(raw)
        assert result == "{\"key\": \"value\"}"
    
    def test_sanitize_fenced_json_no_fences(self):
        """Test passthrough when no fences present."""
        raw = "{\"key\": \"value\"}"
        result = sanitize_fenced_json(raw)
        assert result == "{\"key\": \"value\"}"
    
    def test_sanitize_fenced_json_empty(self):
        """Test empty input."""
        assert sanitize_fenced_json("") == ""
        assert sanitize_fenced_json("   ") == ""
    
    def test_extract_first_json_object_simple(self):
        """Test extraction of simple JSON object."""
        text = "prefix {\"key\": \"value\"} suffix"
        result = extract_first_json_object(text)
        assert result == "{\"key\": \"value\"}"
    
    def test_extract_first_json_object_nested(self):
        """Test extraction with nested objects."""
        text = 'text {"outer": {"inner": "value"}} more'
        result = extract_first_json_object(text)
        assert result == '{"outer": {"inner": "value"}}'
    
    def test_extract_first_json_object_not_found(self):
        """Test when no JSON object exists."""
        text = "no json here"
        result = extract_first_json_object(text)
        assert result == ""
    
    def test_load_json_object_simple(self):
        """Test JSON loading from valid input."""
        raw = '{"key": "value"}'
        result = load_json_object(raw)
        assert result == {"key": "value"}
    
    def test_load_json_object_with_fences(self):
        """Test JSON loading from fenced input."""
        raw = "```json\n{\"key\": \"value\"}\n```"
        result = load_json_object(raw)
        assert result == {"key": "value"}
    
    def test_load_json_object_invalid(self):
        """Test error handling for invalid JSON."""
        with pytest.raises(ValueError):
            load_json_object("not json at all")
    
    def test_load_json_object_non_dict(self):
        """Test error when JSON root is not an object."""
        with pytest.raises(ValueError):
            load_json_object("[1, 2, 3]")
    
    def test_clamp_score_in_range(self):
        """Test score clamping within valid range."""
        assert clamp_score(50, default=0) == 50
        assert clamp_score(0, default=50) == 0
        assert clamp_score(100, default=50) == 100
    
    def test_clamp_score_below_min(self):
        """Test score clamping below minimum."""
        assert clamp_score(-10, default=50) == 0
    
    def test_clamp_score_above_max(self):
        """Test score clamping above maximum."""
        assert clamp_score(150, default=50) == 100
    
    def test_clamp_score_invalid(self):
        """Test default value on invalid input."""
        assert clamp_score("invalid", default=50) == 50
        assert clamp_score(None, default=75) == 75
    
    def test_normalize_text_string(self):
        """Test string normalization."""
        assert normalize_text("  hello  ") == "hello"
        assert normalize_text("hello") == "hello"
    
    def test_normalize_text_non_string(self):
        """Test non-string value normalization."""
        assert normalize_text(123) == "123"
        assert normalize_text(None) == ""
    
    def test_normalize_errors_string(self):
        """Test error list normalization from string."""
        result = normalize_errors("error message")
        assert result == ["error message"]
    
    def test_normalize_errors_list(self):
        """Test error list normalization from list."""
        result = normalize_errors(["error 1", "error 2"])
        assert result == ["error 1", "error 2"]
    
    def test_normalize_errors_empty_removed(self):
        """Test that empty error strings are removed."""
        result = normalize_errors(["error", "", "  ", "another"])
        assert result == ["error", "another"]
    
    def test_normalize_serious_mistakes_string(self):
        """Test mistakes normalization from list of strings."""
        result = normalize_serious_mistakes(["bug found"])
        assert len(result) == 1
        assert result[0]["severity"] == "high"
        assert result[0]["description"] == "bug found"
    
    def test_normalize_serious_mistakes_dict(self):
        """Test mistakes normalization from dict."""
        input_data = [
            {"description": "logic error", "severity": "critical", "action": "fix loop"}
        ]
        result = normalize_serious_mistakes(input_data)
        assert len(result) == 1
        assert result[0]["severity"] == "critical"
        assert result[0]["description"] == "logic error"
        assert result[0]["action"] == "fix loop"
    
    def test_normalize_serious_mistakes_invalid_severity(self):
        """Test that invalid severity defaults to high."""
        input_data = [{"description": "bug", "severity": "invalid"}]
        result = normalize_serious_mistakes(input_data)
        assert result[0]["severity"] == "high"
    
    def test_normalize_serious_mistakes_empty_description_skipped(self):
        """Test that items with empty descriptions are skipped."""
        input_data = [
            {"description": "", "severity": "high"},
            {"description": "real error", "severity": "high"},
        ]
        result = normalize_serious_mistakes(input_data)
        assert len(result) == 1
        assert result[0]["description"] == "real error"


# ─── Configuration Tests ───────────────────────────────────────────────────────

class TestConfiguration:
    """Tests for configuration module."""
    
    def test_llm_config_values(self):
        """Test LLM temperature values."""
        assert LLMConfig.STRUCTURED == 0.0
        assert LLMConfig.PRECISE == 0.1
        assert LLMConfig.BALANCED == 0.3
        assert LLMConfig.CREATIVE == 0.7
    
    def test_scoring_config_values(self):
        """Test scoring configuration."""
        assert ScoringConfig.MIN == 0
        assert ScoringConfig.MAX == 100
        assert ScoringConfig.DEFAULT == 50
    
    def test_severity_config_valid_levels(self):
        """Test valid severity levels."""
        assert "low" in SeverityConfig.VALID_LEVELS
        assert "medium" in SeverityConfig.VALID_LEVELS
        assert "high" in SeverityConfig.VALID_LEVELS
        assert "critical" in SeverityConfig.VALID_LEVELS
    
    def test_agent_config_coding(self):
        """Test coding agent configuration."""
        assert AgentConfig.CodingAgent.PLANNER_TEMPERATURE == LLMConfig.PRECISE
        assert AgentConfig.CodingAgent.CODER_TEMPERATURE == LLMConfig.PRECISE
        assert AgentConfig.CodingAgent.REVIEWER_TEMPERATURE == LLMConfig.STRUCTURED
    
    def test_agent_config_orchestrator(self):
        """Test orchestrator agent configuration."""
        assert AgentConfig.OrchestratorAgent.DECOMPOSER_TEMPERATURE == LLMConfig.BALANCED
        assert AgentConfig.OrchestratorAgent.RESEARCHER_TEMPERATURE == LLMConfig.CREATIVE
        assert AgentConfig.OrchestratorAgent.CRITIC_TEMPERATURE == LLMConfig.STRUCTURED


# ─── Context Injection Tests ───────────────────────────────────────────────────

class TestContextInjection:
    """Tests for memory context injection."""
    
    def test_has_memory_context_with_content(self):
        """Test memory context detection with content."""
        assert has_memory_context("some context")
        assert has_memory_context("  not empty  ")
    
    def test_has_memory_context_without_content(self):
        """Test memory context detection without content."""
        assert not has_memory_context(None)
        assert not has_memory_context("")
        assert not has_memory_context("   ")
    
    def test_inject_memory_context_with_context(self):
        """Test context injection when memory available."""
        memory = "Prior conversation"
        task = "New task"
        result = inject_memory_context(task, memory)
        assert "Prior conversation" in result
        assert "New task" in result
    
    def test_inject_memory_context_without_context(self):
        """Test context injection when memory unavailable."""
        task = "New task"
        result = inject_memory_context(task, None)
        assert result == task


# ─── SSE Streaming Tests ───────────────────────────────────────────────────────

class TestSSEStreaming:
    """Tests for SSE event formatting."""
    
    def test_create_sse_event(self):
        """Test SSE event creation."""
        event = create_sse_event("token", content="hello")
        assert event["type"] == "token"
        assert event["content"] == "hello"
    
    def test_format_sse_event(self):
        """Test SSE event formatting."""
        event = {"type": "token", "content": "test"}
        result = format_sse_event(event)
        assert result.startswith("data: ")
        assert result.endswith("\n\n")
        assert "token" in result
        assert "test" in result
    
    def test_format_sse_event_json_valid(self):
        """Test that formatted SSE contains valid JSON."""
        event = {"type": "done", "value": 42}
        result = format_sse_event(event)
        # Extract JSON from "data: {...}\n\n"
        json_str = result.split("data: ")[1].strip()
        parsed = json.loads(json_str)
        assert parsed["type"] == "done"
        assert parsed["value"] == 42


# ─── Graph Nodes Tests ─────────────────────────────────────────────────────────

class TestGraphNodes:
    """Tests for graph node coordinate definitions."""
    
    def test_coding_node_coords(self):
        """Test coding agent node coordinates."""
        coords = get_coding_node_coords()
        assert "router" in coords
        assert "code_planner" in coords
        assert "coder_1" in coords
        assert "code_aggregator" in coords
        assert "code_reviewer" in coords
        assert len(coords) == 8
    
    def test_deep_research_node_coords(self):
        """Test deep research node coordinates."""
        coords = get_deep_research_node_coords()
        assert "router" in coords
        assert "researcher_1" in coords
        assert "researcher_2" in coords
        assert "aggregator" in coords
        assert "critic" in coords
        assert len(coords) == 7
    
    def test_standard_node_coords(self):
        """Test standard path node coordinates."""
        coords = get_standard_node_coords()
        assert "router" in coords
        assert "output" in coords
        assert len(coords) == 2
    
    def test_node_coords_have_x_y(self):
        """Test that all node coordinates have x and y."""
        for coord_func in [get_coding_node_coords, get_deep_research_node_coords, get_standard_node_coords]:
            coords = coord_func()
            for node_id, position in coords.items():
                assert "x" in position, f"Missing x for {node_id}"
                assert "y" in position, f"Missing y for {node_id}"
                assert isinstance(position["x"], (int, float))
                assert isinstance(position["y"], (int, float))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
