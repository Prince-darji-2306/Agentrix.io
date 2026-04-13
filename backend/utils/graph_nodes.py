"""
Centralized graph node coordinate definitions.

Single source of truth for task execution graph layout across all pipelines.
Allows easy tuning of graph appearance without modifying agent code.

Coordinates are in SVG units (0,0 is top-left).
Typical viewport: 800x600 or larger.
"""


class CodingAgentCoords:
    """Node positions for the coding agent task graph."""
    
    NODES = {
        "router":          {"x": 400, "y": 60},
        "code_planner":    {"x": 400, "y": 160},
        "coder_1":         {"x": 180, "y": 280},
        "coder_2":         {"x": 400, "y": 280},
        "coder_3":         {"x": 620, "y": 280},
        "code_aggregator": {"x": 400, "y": 400},
        "code_reviewer":   {"x": 400, "y": 480},
        "output":          {"x": 400, "y": 560},
    }


class DeepResearchCoords:
    """Node positions for the deep research orchestrator task graph."""
    
    NODES = {
        "router":       {"x": 400, "y": 60},
        "orchestrator": {"x": 400, "y": 160},
        "researcher_1": {"x": 240, "y": 280},
        "researcher_2": {"x": 560, "y": 280},
        "aggregator":   {"x": 400, "y": 400},
        "critic":       {"x": 400, "y": 480},
        "output":       {"x": 400, "y": 560},
    }


class StandardPathCoords:
    """Node positions for the standard chat task graph."""
    
    NODES = {
        "router": {"x": 400, "y": 60},
        "output": {"x": 400, "y": 200},
    }


def get_coding_node_coords() -> dict:
    """Get node coordinates for coding agent graph."""
    return CodingAgentCoords.NODES


def get_deep_research_node_coords() -> dict:
    """Get node coordinates for deep research graph."""
    return DeepResearchCoords.NODES


def get_standard_node_coords() -> dict:
    """Get node coordinates for standard chat graph."""
    return StandardPathCoords.NODES
