# API layer

A thin FastAPI service that exposes the existing pipeline (`db/`, `phase0/`,
`phase1_precall/`, `phase2_telephony/`) over HTTP, for the `frontend/` app to
call. No pipeline logic lives here — each route in `api/routers/` just
adapts a request/response shape and calls straight into the existing
`db.auth` / `db.crud` / `phase0.pipeline` / etc. functions, the same ones
`uii/pipeline_data.py` already calls for the Streamlit dashboard.

## Setup

From the project root, with the root `requirements.txt` already installed:

```bash
pip install -r api/requirements.txt
```

Add these to the project's root `.env` (alongside the existing
`GROQ_API_KEY`, `DOGRAH_API_KEY`, SMTP settings, etc.):

```
API_JWT_SECRET=some-long-random-string
API_CORS_ORIGINS=http://localhost:5173
```

## Run

```bash
uvicorn api.main:app --reload --port 8040
```

Interactive API docs are then available at `http://localhost:8040/docs`.

## Auth model

`db/auth.py`'s password hashing/verification is unchanged. This layer adds
what a stateless HTTP frontend needs on top: a signed bearer token
(`api/security.py`) identifying which company or candidate account is
logged in, and a short-lived server-side store for signup email
verification codes (kept on the server rather than sent back to the
browser).
