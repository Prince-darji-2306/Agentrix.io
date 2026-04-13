import os

from autogen_ext.models.openai import OpenAIChatCompletionClient


GROQ_OPENAI_BASE_URL = "https://api.groq.com/openai/v1"


def get_autogen_groq_client(model: str, temperature: float = 0.7) -> OpenAIChatCompletionClient:
    """Create an AutoGen-compatible OpenAI client targeting Groq."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is required for AutoGen debate execution.")

    # AutoGen 0.4 requires model_info for non-standard OpenAI model names.
    # We provide standard capabilities for Groq-hosted models.
    model_info = {
        "vision": False,
        "function_calling": True,
        "json_output": True,
        "family": "gpt-4",  # Using gpt-4 family as a safe baseline for capabilities
    }

    return OpenAIChatCompletionClient(
        model=model,
        api_key=api_key,
        base_url=GROQ_OPENAI_BASE_URL,
        temperature=temperature,
        model_info=model_info,
    )
