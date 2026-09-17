"""
Central config. Mirrors the pattern from Compliance Master's MODEL_CHAIN.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env relative to this file's own location, not the process's
# current working directory -- bare load_dotenv() searches upward from cwd,
# which is unreliable across different ways of running this (terminal vs
# an IDE's Run button vs Streamlit subprocess all set cwd differently).
# This folder's parent (ai_interview_agent/) is where the shared .env lives.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")

# --- Groq model fallback chain (same idea as Compliance Master) ---
# Order matters: try first, fall back on rate-limit/error.
# NOTE: llama-3.3-70b-versatile, llama-3.1-70b-versatile, mixtral-8x7b-32768,
# and llama-3.1-8b-instant have ALL been deprecated by Groq (mixtral in
# March 2025, llama-3.1-70b-versatile in favor of 3.3, and llama-3.3-70b-versatile
# + llama-3.1-8b-instant themselves in June 2026). Using their recommended
# replacements -- same openai/gpt-oss-120b already used as phase1's default model.
MODEL_CHAIN = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
]


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Check that it's set in a .env file this process can find "
            f"(shortlist_config.py's load_dotenv() searches the current "
            f"working directory upward, not this file's own folder)."
        )
    return value


GROQ_API_KEY = _require("GROQ_API_KEY")

# --- Embedding model (Stage 1 filter) ---
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

# Keep top X% of resumes after embedding similarity, OR above this floor,
# whichever lets more through (never fewer than MIN_CANDIDATES_TO_LLM).
EMBEDDING_TOP_PERCENT = 0.4
EMBEDDING_SIM_FLOOR = 0.35
MIN_CANDIDATES_TO_LLM = 5

# --- Paths ---
# Anchored to this file's own folder (_PROJECT_ROOT/phase0_shortlisting),
# not the process's cwd -- same reasoning as the .env fix above. A relative
# "./checkpoints" would land in a different real folder depending on
# whether this runs via terminal, an IDE's Run button, or as a module
# imported from ui/pipeline_data.py (which has a different cwd again).
_PHASE0_DIR = Path(__file__).resolve().parent
RESUME_INCOMING_DIR = os.getenv(
    "RESUME_INCOMING_DIR", str(_PHASE0_DIR / "resumes" / "incoming")
)
TEXT_CACHE_DIR = os.getenv("TEXT_CACHE_DIR", str(_PHASE0_DIR / "cache" / "resume_text"))
CHECKPOINT_DIR = os.getenv("CHECKPOINT_DIR", str(_PHASE0_DIR / "checkpoints"))

# --- Shortlist decision threshold (LLM match_score, 0-100) ---
SHORTLIST_SCORE_THRESHOLD = (
    50  # score > 50 -> shortlisted, else rejected. Only these 2 outcomes exist now.
)
READY_TO_CALL_SCORE_THRESHOLD = (
    50  # same as shortlist threshold -- every shortlisted candidate is call-ready
)
