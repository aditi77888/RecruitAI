"""
API layer for the new frontend. Wraps the existing db/auth, db/crud, and
phase0-4 pipeline functions behind HTTP endpoints -- no pipeline logic
lives here, only request/response adaptation (see api/services.py).

Run from the project root:
    uvicorn api.main:app --reload --port 8040
"""

import os

from api import bootstrap  # noqa: F401  (sets up sys.path before anything else)
from api.routers import auth, candidate_portal, candidates, jds, reports, settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RecruitAI API", version="1.0.0")

_allowed_origins = os.environ.get("API_CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jds.router)
app.include_router(candidates.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(candidate_portal.router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api.main:app", host="0.0.0.0", port=int(os.environ.get("API_PORT", "8040")), reload=True)
