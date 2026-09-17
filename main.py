from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from enum import Enum

app = FastAPI(
    title="Hiring Automation API",
    description="Automated hiring pipeline API built with FastAPI",
    version="0.1.0",
)


class CandidateStatus(str, Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    OFFERED = "offered"
    HIRED = "hired"
    REJECTED = "rejected"


class Candidate(BaseModel):
    id: int
    name: str
    email: str
    role: str
    experience_years: float
    skills: List[str] = []
    status: CandidateStatus = CandidateStatus.APPLIED


# In-memory database sample
candidates_db: List[Candidate] = [
    Candidate(
        id=1,
        name="Alex Mercer",
        email="alex.mercer@example.com",
        role="Senior Python Engineer",
        experience_years=5.5,
        skills=["Python", "FastAPI", "Docker", "PostgreSQL"],
        status=CandidateStatus.SCREENING,
    )
]


@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Hiring Automation API",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }


@app.get("/candidates", response_model=List[Candidate])
def get_candidates():
    return candidates_db


@app.post("/candidates", response_model=Candidate, status_code=201)
def create_candidate(candidate: Candidate):
    for c in candidates_db:
        if c.id == candidate.id:
            raise HTTPException(status_code=400, detail="Candidate ID already exists")
    candidates_db.append(candidate)
    return candidate


@app.get("/candidates/{candidate_id}", response_model=Candidate)
def get_candidate(candidate_id: int):
    for c in candidates_db:
        if c.id == candidate_id:
            return c
    raise HTTPException(status_code=404, detail="Candidate not found")
