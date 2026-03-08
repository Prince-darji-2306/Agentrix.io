import os
from groq import Groq
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

def get_llm(temperature = 0.1, change = True):
    model = 'openai/gpt-oss-20b'
    if change:
        model = 'meta-llama/llama-4-scout-17b-16e-instruct'
        
    return ChatGroq(
        model=model,
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=temperature,
    )

def get_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))
