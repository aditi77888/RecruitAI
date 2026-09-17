"""Central config for Phase 4 (post-call evaluation)."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env relative to this file's own location (ai_interview_agent/.env),
# not the process's current working directory -- same reasoning as
# phase0_shortlisting/shortlist_config.py and phase2_telephony/config.py.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")

# --- Groq (reuse the same key as Phase 1/2) ---
GROQ_API_KEY = os.environ["GROQ_API_KEY"]
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

# --- Dograh (to fetch transcript) ---
DOGRAH_API_KEY = os.environ["DOGRAH_API_KEY"]

# --- This webhook server itself ---
POSTCALL_SERVER_PORT = int(os.environ.get("POSTCALL_SERVER_PORT", "8020"))

# --- Email notification (Gmail SMTP with an App Password -- NOT your normal
# Gmail password. Generate one at https://myaccount.google.com/apppasswords) ---
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_APP_PASSWORD = os.environ.get("SMTP_APP_PASSWORD", "")
FROM_NAME = os.environ.get("FROM_NAME", "VadaTechnoSpace Hiring")