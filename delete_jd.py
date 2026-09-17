"""
Deletes a JD and everything under it -- irreversible.

Run from ai_interview_agent/:
    python delete_jd.py test_jd

Use the jd_id (not the title) -- check db/crud.get_jds() or the Dashboard
if you're unsure of the exact jd_id.
"""
import sys
from db import crud

if len(sys.argv) != 2:
    print("Usage: python delete_jd.py <jd_id>")
    raise SystemExit(1)

jd_id = sys.argv[1]
existing = crud.get_jd(jd_id)
if not existing:
    print(f"No JD found with jd_id={jd_id!r}. Current JDs:")
    for jd in crud.get_jds():
        print(f"  - {jd['jd_id']}  ({jd['title']})")
    raise SystemExit(1)

crud.delete_jd(jd_id)
print(f"Deleted JD '{existing['title']}' ({jd_id}) and all its candidates/evaluations.")