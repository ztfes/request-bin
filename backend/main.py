import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import bins, catch_all, websocket

app = FastAPI(title="Request Bin")

frontend_origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins.split(",") if origin.strip()],
    allow_methods=["GET"],
    allow_headers=["Owner-Token"],
)

# bins must come first -- catch_all's /{full_path:path} would otherwise swallow it.
app.include_router(bins.router)
app.include_router(websocket.router)
app.include_router(catch_all.router)