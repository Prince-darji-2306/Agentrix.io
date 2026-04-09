import os
from groq import Groq
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

load_dotenv()


def get_llm(temperature: float = 0.1, change: bool = True, instant = False):
    """Return a ChatGroq LLM instance. change=True uses Llama-4, change=False uses GPT-oss."""
    model = "openai/gpt-oss-20b"
    if change:
        model = "meta-llama/llama-4-scout-17b-16e-instruct"
    if instant:
        model = "llama-3.1-8b-instant"

    return ChatGroq(
        model=model,
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=temperature,
    )


def get_client() -> Groq:
    """Return a raw Groq client (for streaming completions)."""
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

def coding_llm(temperature: float = 0.2):
    return ChatOpenAI(
        model="stepfun/step-3.5-flash:free",
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=temperature
    )