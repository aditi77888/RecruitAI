"""
Stage 1: BGE embedding cosine-similarity filter.

Purpose: cut the resume set BEFORE the expensive/rate-limited LLM stage.
Same embedding model you already used in GenericRAG (BAAI/bge-small-en-v1.5).
"""
from __future__ import annotations
import numpy as np
from sentence_transformers import SentenceTransformer

from phase0.shortlist_config import EMBEDDING_MODEL, EMBEDDING_TOP_PERCENT, EMBEDDING_SIM_FLOOR, MIN_CANDIDATES_TO_LLM
from phase0.models import ResumeRecord, JDRecord, EmbeddingFilterResult

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))


def filter_resumes(resumes: list[ResumeRecord], jd: JDRecord) -> list[EmbeddingFilterResult]:
    """
    Returns a filter result per resume. Resumes marked passed_filter=True
    are the ones that go on to the LLM stage.
    """
    model = _get_model()
    jd_text = jd.raw_text
    if jd.must_have_skills:
        jd_text += "\nRequired skills: " + ", ".join(jd.must_have_skills)

    jd_vec = model.encode(jd_text, normalize_embeddings=True)
    resume_vecs = model.encode([r.raw_text for r in resumes], normalize_embeddings=True)

    scored = []
    for resume, vec in zip(resumes, resume_vecs):
        sim = _cosine_sim(jd_vec, vec)
        scored.append((resume, sim))

    scored.sort(key=lambda x: x[1], reverse=True)

    top_n_count = max(
        MIN_CANDIDATES_TO_LLM,
        int(len(scored) * EMBEDDING_TOP_PERCENT),
    )

    results = []
    for i, (resume, sim) in enumerate(scored):
        passed = (i < top_n_count) or (sim >= EMBEDDING_SIM_FLOOR)
        results.append(EmbeddingFilterResult(
            resume_hash=resume.resume_hash,
            jd_id=jd.jd_id,
            similarity_score=round(sim, 4),
            passed_filter=passed,
        ))
    return results