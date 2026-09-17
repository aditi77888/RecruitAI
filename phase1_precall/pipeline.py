"""
Orchestrator.

UI path (what the Dashboard's "Send to Shortlisting" button calls):
    run_shortlisting_for_jd(jd_id, file_paths, resume_link_map)

CLI path (manual/debug runs against a folder of resumes):
    python pipeline_data.py --jd-id backend_dev_2026 --resume-dir ./resumes/incoming

Flow (same as before, minus the Sheets step):
  1. Load the JD from the DB (created earlier via the UI's "+ Add JD" form)
  2. Extract + normalize the given resumes (cached, hash-deduped)
  3. Embedding pre-filter vs the JD
  4. LLM structured evaluation on survivors only, resumable via checkpoint
  5. Write results into the shared DB (jds/candidates tables)
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import auth, crud
from phase0.checkpoint import append_result, load_all_results, load_done_hashes
from phase0.db_sync import sync_evaluations_to_db
from phase0.embedding_filter import filter_resumes
from phase0.llm_evaluator import evaluate_resume
from phase0.models import JDRecord
from phase0.text_extraction import load_all_resumes, process_resume_files


def _company_thresholds(jd_row: dict) -> tuple[float | None, float | None]:
    """
    Returns (shortlist_threshold, ready_to_call_threshold) for the JD's
    company, or (None, None) if the JD has no company (legacy/admin JD) --
    evaluate_resume()/load_all_results() fall back to the global config
    default in that case.
    """
    company_id = jd_row.get("company_id")
    if not company_id:
        return None, None
    company = auth.get_company(company_id)
    if not company:
        return None, None
    threshold = company.get("shortlist_threshold")
    # Same value drives both -- a company sets one "shortlist bar" in
    # Settings, not two separate tiers (matches the earlier shortlist/reject-
    # only simplification).
    return threshold, threshold


def load_jd(jd_id: str) -> JDRecord:
    """Reads the JD from the DB instead of a JSON file."""
    jd_row = crud.get_jd(jd_id)
    if jd_row is None:
        raise ValueError(
            f"No JD found in the DB with jd_id={jd_id!r}. Create it via the UI first."
        )

    def _split(csv: str | None) -> list[str]:
        return [s.strip() for s in (csv or "").split(",") if s.strip()]

    return JDRecord(
        jd_id=jd_row["jd_id"],
        title=jd_row["title"],
        raw_text=jd_row["jd_text"],
        must_have_skills=_split(jd_row["must_have_skills"]),
        nice_to_have_skills=_split(jd_row["nice_to_have_skills"]),
        min_experience_years=jd_row["min_experience"],
    )


def run_shortlisting_for_jd(
    jd_id: str,
    file_paths: list[str],
    resume_link_map: dict[str, str] | None = None,
    candidate_account_id: str | None = None,
) -> dict:
    """
    Main entry point -- call this from the UI with the list of file paths
    just uploaded for one JD (one "Send to Shortlisting" click).

    candidate_account_id: set when this call came from the candidate
    self-service portal (a single candidate applying to this one JD), so
    the resulting application links back to their login account.
    """
    jd = load_jd(jd_id)
    jd_row = crud.get_jd(jd_id)
    shortlist_threshold, ready_threshold = _company_thresholds(jd_row)

    print(f"[1/4] Extracting text from {len(file_paths)} uploaded resumes...")
    resumes = process_resume_files(file_paths)

    print(f"[2/4] Embedding pre-filter vs JD '{jd.title}'...")
    filter_results = filter_resumes(resumes, jd)
    passed = {r.resume_hash for r in filter_results if r.passed_filter}
    print(f"      {len(passed)}/{len(resumes)} resumes passed to LLM stage.")

    print("[3/4] LLM evaluation (resumable)...")
    already_done = load_done_hashes(jd.jd_id)
    resumes_by_hash = {r.resume_hash: r for r in resumes}
    to_evaluate = [h for h in passed if h not in already_done]
    print(
        f"      {len(already_done)} already done (skipping), {len(to_evaluate)} to evaluate now."
    )

    errors = []
    for resume_hash in to_evaluate:
        resume = resumes_by_hash[resume_hash]
        try:
            evaluation = evaluate_resume(
                resume,
                jd,
                shortlist_threshold=shortlist_threshold,
                ready_to_call_threshold=ready_threshold,
            )
            append_result(jd.jd_id, evaluation)
            print(
                f"      {resume_hash[:8]}  score={evaluation.match_score:.0f}  "
                f"verdict={evaluation.verdict}  model={evaluation.model_used}"
            )
        except RuntimeError as e:
            print(f"      FAILED {resume_hash[:8]}: {e}")
            errors.append(f"{resume_hash[:8]}: {e}")
            continue  # move on, don't kill the whole batch over one resume

    all_evaluations = load_all_results(jd.jd_id, shortlist_threshold, ready_threshold)
    # Only sync the ones from THIS batch's resumes -- load_all_results returns
    # every evaluation ever done for this jd_id (checkpoint is cumulative),
    # which is fine to re-sync since db_sync is idempotent by (jd_id, hash).

    print(f"[4/4] Writing {len(all_evaluations)} evaluated candidates into the DB...")
    resume_text_map = {h: r.raw_text for h, r in resumes_by_hash.items()}
    sync_result = sync_evaluations_to_db(
        all_evaluations, resume_link_map, resume_text_map, candidate_account_id
    )
    print(f"      DB sync: {sync_result}")

    shortlisted = [e for e in all_evaluations if e.verdict == "shortlist"]
    ready = [e for e in all_evaluations if e.ready_to_call]
    return {
        "total_resumes": len(resumes),
        "passed_embedding_filter": len(passed),
        "evaluated": len(all_evaluations),
        "shortlisted": len(shortlisted),
        "ready_to_call": len(ready),
        "db_sync": sync_result,
        "errors": errors,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--jd-id", required=True, help="jd_id of a JD already created via the UI"
    )
    parser.add_argument(
        "--resume-dir",
        required=False,
        default=None,
        help="Folder of resumes to process (defaults to RESUME_INCOMING_DIR)",
    )
    args = parser.parse_args()

    resumes = (
        load_all_resumes(args.resume_dir) if args.resume_dir else load_all_resumes()
    )
    file_paths = [r.file_path for r in resumes]

    summary = run_shortlisting_for_jd(args.jd_id, file_paths)
    print(json.dumps(summary, indent=2))
