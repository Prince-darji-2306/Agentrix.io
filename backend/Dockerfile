# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 7860
ENV HOME=/home/user
ENV TRANSFORMERS_CACHE=$HOME/.cache

# Create a non-root user
RUN useradd -m -u 1000 user
USER user
WORKDIR $HOME/app

# Set path
ENV PATH="/home/user/.local/bin:${PATH}"

# Install system dependencies (as root)
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*
USER user

# Install Python dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"

# Copy the rest of the backend code
COPY --chown=user . .

# Expose the port the app runs on
EXPOSE 7860

# Run the application
CMD ["uvicorn", "core.app:app", "--host", "0.0.0.0", "--port", "7860"]
