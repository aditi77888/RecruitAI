"""
Entry point for Phase 1.

Usage:
  python main.py           # run one pass immediately, then poll forever on a schedule
  python main.py --once    # run a single pass and exit (useful for testing)
"""

import logging
import sys

import config
from scheduler import process_pending_candidates, run_scheduler


def setup_logging() -> None:
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


if __name__ == "__main__":
    setup_logging()

    if "--once" in sys.argv:
        process_pending_candidates()
    else:
        process_pending_candidates()  # immediate first run, then the scheduler takes over
        run_scheduler()