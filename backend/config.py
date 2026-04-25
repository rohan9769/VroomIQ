import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# Remote Qdrant (Qdrant Cloud) — set both to use cloud
QDRANT_URL = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

# Local embedded fallback (no Docker needed for dev)
QDRANT_LOCAL_PATH = str(Path(__file__).parent / "qdrant_data")

COLLECTION_NAME = "cars"
EMBED_MODEL = "BAAI/bge-small-en-v1.5"
CLAUDE_MODEL = "claude-sonnet-4-6"
