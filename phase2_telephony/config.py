"""Central config for Phase 2 -- loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env relative to this file's own location (ai_interview_agent/.env),
# not the process's current working directory -- see the same note in
# phase0_shortlisting/shortlist_config.py.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")

# --- Candidate call_status values (must match the DB's Candidate.call_status
# vocabulary: pending/dialing/completed/failed) ---
STATUS_DIALING = "dialing"
STATUS_FAILED = "failed"

# --- Dograh ---
# DOGRAH_API_KEY is still required -- phase4's webhook uses it to fetch
# transcripts regardless of whether the call came via phone or the widget.
DOGRAH_API_KEY = os.environ["DOGRAH_API_KEY"]

# DOGRAH_API_BASE_URL and DOGRAH_TRIGGER_UUID are only used by the OLD
# phone-dial path (dispatcher.py/dograh_client.py), which is dormant now
# that the widget flow (link_dispatcher.py) is active -- optional so a
# fresh setup doesn't need irrelevant values just to avoid a crash. Fill
# these in only if you want the old phone-dispatch fallback to keep working.
DOGRAH_API_BASE_URL = os.environ.get(
    "DOGRAH_API_BASE_URL", ""
)  # e.g. http://localhost:8000
DOGRAH_TRIGGER_UUID = os.environ.get("DOGRAH_TRIGGER_UUID", "")

# While testing, hit the /test/{uuid} URL so you're running your latest
# DRAFT workflow instead of the published one. Flip to "false" once you've
# published and want real calls to run production.
DOGRAH_USE_TEST_TRIGGER = (
    os.environ.get("DOGRAH_USE_TEST_TRIGGER", "true").lower() == "true"
)

# Optional -- only needed if you want to override the org's default outbound
# telephony configuration (e.g. calling from a specific number/provider).
# Leave unset to use whatever's set as default in Dograh's Telephony
# configurations page.
DOGRAH_TELEPHONY_CONFIG_ID = os.environ.get("DOGRAH_TELEPHONY_CONFIG_ID") or None

# --- This precall server itself (only needed if you decide to use Dograh's
# separate "Pre-Call Data Fetch" feature later -- not required for the
# current flow, since we send candidate_name/interview_context directly in
# initial_context at trigger time) ---
PRECALL_SERVER_PORT = int(os.environ.get("PRECALL_SERVER_PORT", "8010"))

# --- Dispatcher pacing ---
SECONDS_BETWEEN_CALLS = int(os.environ.get("SECONDS_BETWEEN_CALLS", "5"))

# --- Batch calling ---
# How many candidates get dialed per batch. Keep this at or below however
# many CONCURRENT calls your Smartflo/Tata Tele trunk actually supports --
# confirm this number with your mentor before raising it. If unsure, 1-2 is
# the safest starting point.
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "5"))

# Pause after a whole batch finishes before starting the next one (gives
# Dograh/Smartflo room to fully wrap up the previous calls).
SECONDS_BETWEEN_BATCHES = int(os.environ.get("SECONDS_BETWEEN_BATCHES", "60"))

# --- Recurring dispatcher (optional -- see scheduler.py) ---
# How often the dispatcher automatically re-checks for ready_to_call
# candidates, including ones requeued after a reschedule request or a
# disconnected call. Only takes effect if you run scheduler.py (or set
# this up as its own background process) -- a one-off `python -m
# phase2_telephony.dispatcher` run doesn't repeat on its own.
DISPATCH_POLL_INTERVAL_MINUTES = int(
    os.environ.get("DISPATCH_POLL_INTERVAL_MINUTES", "30")
)

# =====================================================================
# WEB-WIDGET INTERVIEW FLOW (replaces phone dial -- no telephony account
# needed). Everything below is new; everything above this line still
# belongs to the old phone-dispatch path (dispatcher.py/dograh_client.py),
# kept in place in case telephony access comes back later, but no longer
# the active path -- link_dispatcher.py is now what the UI calls.
# =====================================================================

# The widget's script URL from Dograh's dashboard (Agent settings -> gear
# icon -> Add to Website -> Configure Widget -> Voice -> Floating Widget ->
# Save Configurations -> copy the embed code -> find the line that looks
# like `js.src = '...';` inside it and paste ONLY that URL string here.
#
# IMPORTANT: don't paste it as-is if it points at localhost (e.g.
# 'http://localhost:3000/embed/...') -- that only works on YOUR machine, not
# for a real candidate visiting from elsewhere. Instead, route it through
# THIS server's own /widget proxy path so only one ngrok tunnel is needed
# (see the proxy routes in interview_link_server.py):
#   1. Take the original js.src, e.g.:
#      http://localhost:3000/embed/dograh-widget.js?token=XXX&environment=local&apiEndpoint=http://localhost:8000
#   2. Replace 'http://localhost:3000' with '<your-one-ngrok-domain>/widget'
#   3. Replace the apiEndpoint value with '<your-one-ngrok-domain>/api'
#   Final example:
#      https://your-name.ngrok-free.app/widget/embed/dograh-widget.js?token=XXX&environment=local&apiEndpoint=https://your-name.ngrok-free.app/api
DOGRAH_WIDGET_SRC = os.environ.get("DOGRAH_WIDGET_SRC", "")

# Where the widget/backend actually run locally -- the /widget and /api
# proxy routes in interview_link_server.py forward requests here.
DOGRAH_WIDGET_LOCAL = os.environ.get("DOGRAH_WIDGET_LOCAL", "http://localhost:3000")
DOGRAH_BACKEND_LOCAL = os.environ.get("DOGRAH_BACKEND_LOCAL", "http://localhost:8000")

# Public base URL where interview_link_server.py is reachable by candidates
# (an ngrok URL if self-hosted, same as you already use for the webhook).
# The full link sent to a candidate is INTERVIEW_LINK_BASE_URL + "?token=...".
INTERVIEW_LINK_BASE_URL = os.environ.get(
    "INTERVIEW_LINK_BASE_URL", "http://localhost:8030/interview"
)
INTERVIEW_LINK_SERVER_PORT = int(os.environ.get("INTERVIEW_LINK_SERVER_PORT", "8030"))

# Don't resend the same candidate a link every dispatcher run -- only after
# this many minutes of no response (default 3 days). Candidates whose call
# genuinely failed (bad email, etc.) still retry sooner via call_status='failed'.
LINK_RESEND_AFTER_MINUTES = int(
    os.environ.get("LINK_RESEND_AFTER_MINUTES", str(60 * 24 * 3))
)

# --- Email (sends the interview-link email -- same Gmail SMTP pattern as
# phase4_postcall/notifier.py; can reuse the exact same credentials) ---
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_APP_PASSWORD = os.environ.get("SMTP_APP_PASSWORD", "")
FROM_NAME = os.environ.get("FROM_NAME", "VadaTechnoSpace Hiring")
