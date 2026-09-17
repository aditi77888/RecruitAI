"""
Deletes shortlisted candidates so you can re-run shortlisting from scratch
against the current (score > 50) threshold -- clears BOTH the DB rows and
the checkpoint JSONL file, since the checkpoint cache would otherwise just
resync the old evaluations back into the DB on the next shortlisting run.

Run from ai_interview_agent/:
    python clear_shortlisted.py --jd-id ai_intern     # just one JD
    python clear_shortlisted.py --all                 # every JD
"""

import argparse
import os
import sys

from db import crud

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "phase0_shortlisting"))
from phase0.shortlist_config import (
    CHECKPOINT_DIR,  # reads the real, file-anchored path -- not a guess
)


def _clear_checkpoint(jd_id: str) -> bool:
    path = os.path.join(CHECKPOINT_DIR, f"{jd_id}.jsonl")
    if os.path.exists(path):
        os.remove(path)
        return True
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--jd-id", help="Clear candidates for just this JD")
    group.add_argument(
        "--all", action="store_true", help="Clear candidates for EVERY JD"
    )
    args = parser.parse_args()

    if args.all:
        deleted = crud.delete_candidates_for_jd(None)
        print(f"Deleted {deleted} candidate(s) across all JDs.")
        for jd in crud.get_jds():
            cleared = _clear_checkpoint(jd["jd_id"])
            print(
                f"  checkpoint for {jd['jd_id']}: {'cleared' if cleared else 'none found'}"
            )
    else:
        jd = crud.get_jd(args.jd_id)
        if not jd:
            print(f"No JD found with jd_id={args.jd_id!r}. Current JDs:")
            for j in crud.get_jds():
                print(f"  - {j['jd_id']} ({j['title']})")
            raise SystemExit(1)
        deleted = crud.delete_candidates_for_jd(args.jd_id)
        cleared = _clear_checkpoint(args.jd_id)
        print(f"Deleted {deleted} candidate(s) for '{jd['title']}' ({args.jd_id}).")
        print(f"Checkpoint file: {'cleared' if cleared else 'none found'}.")

    print("\nDone -- ready for a fresh 'Send to Shortlisting' run.")
