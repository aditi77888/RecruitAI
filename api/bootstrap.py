"""
Makes the existing project packages (db/, phase0/, phase1_precall/,
phase2_telephony/, phase4_postcall/) importable from this api/ package,
the same way uii/pipeline_data.py does it for the Streamlit app. Import
this module first, before anything else in api/, so the path is set up
before any phaseX import runs.
"""

import os
import sys

_HERE = os.path.dirname(__file__)
_ROOT = os.path.join(_HERE, "..")

for path in (
    _ROOT,
    os.path.join(_ROOT, "phase1_precall"),
):
    if path not in sys.path:
        sys.path.insert(0, path)
