from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import ensure_indexes
from app.http_client import create_http_client
from app.logging_setup import configure_logging
from app.middleware.request_id import RequestIdMiddleware
from app.routers import analyze, auth, github, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    await ensure_indexes()
    app.state.http_client = create_http_client()
    yield
    await app.state.http_client.aclose()


app = FastAPI(title="ShipStack API", version="1.0.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(github.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
