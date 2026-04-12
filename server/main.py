"""
Run from this directory:
  uvicorn main:app --reload --host 0.0.0.0 --port 8000

The ASGI app lives in app.main; this module exists so `uvicorn main:app` resolves.
"""
from app.main import app

__all__ = ["app"]
