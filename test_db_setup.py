"""
Quick DB setup check. Run from inside ai_interview_agent/:

    python test_db_setup.py

Expect: "DB file ban gayi + tables create ho gaye." followed by the test JD
printed back, and a new db/pipeline.db file appearing on disk.
"""
from db import init_db, crud

init_db()
print("DB file ban gayi + tables create ho gaye.")

crud.create_jd(
    jd_id="test_jd",
    title="Test Job",
    jd_text="Just checking DB setup.",
)
print("Test JD insert hui:", crud.get_jds())