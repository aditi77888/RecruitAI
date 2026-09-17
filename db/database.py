"""
Shared DB engine/session. Every phase (phase0/phase1/phase2/phase4) and the
Streamlit UI import from this file -- one SQLite file, one source of truth,
no Sheets sync anywhere in the loop.

DB file lives at ai_interview_agent/db/pipeline.db by default. Override with
env var PIPELINE_DB_PATH if you want it elsewhere (e.g. for tests).
"""

import os
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base

DB_PATH = os.getenv(
    "PIPELINE_DB_PATH",
    str(Path(__file__).resolve().parent / "pipeline.db"),
)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},  # needed for Streamlit's threading
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    """Create all tables if they don't exist yet. Call once at app startup."""
    Base.metadata.create_all(bind=engine)


@contextmanager
def get_session():
    """
    Usage:
        with get_session() as db:
            db.add(candidate)
            db.commit()
    Handles rollback on error and always closes the session.
    """
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
