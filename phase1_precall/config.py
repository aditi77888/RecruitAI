"""
Central configuration for Phase 1: interview-context generation.
All values are loaded from environment variables (.aenvv file) so no secrets are hardcoded.

Note: resume extraction (Drive download, PDF/DOCX/OCR) still lives in
resume_extractor.py and is used as a fallback -- the common path is that
phase0 already extracted resume_text into the DB, so phase1 doesn't need
to re-download/re-OCR anything.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Anchor everything to this file's own folder, not the caller's working
# directory -- so `python phase1_precall/main.py` from the parent folder
# and `python main.py` from inside phase1_precall both work identically.
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Check your .aenvv file against .aenvv.example."
        )
    return value


def _resolve_path(raw_path: str) -> str:
    """Relative paths (from .aenvv or defaults) are resolved against this
    file's folder, not whatever directory you happen to run `python` from."""
    path = Path(raw_path)
    return str(path if path.is_absolute() else BASE_DIR / path)


# --- Groq LLM ---
GROQ_API_KEY = _require("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# --- Scheduler ---
POLL_INTERVAL_MINUTES = int(os.getenv("POLL_INTERVAL_MINUTES", "2"))

# --- File handling (only used by resume_extractor.py's Drive-link fallback) ---
DOWNLOAD_DIR = Path(_resolve_path(os.getenv("DOWNLOAD_DIR", "downloads")))
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

# --- Logging ---
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")