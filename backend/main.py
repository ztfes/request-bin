import asyncio
import logging
import os
import socket
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import bins, catch_all, websocket
from services.cleanup import sweep_loop

load_dotenv()

# Uvicorn only configures its own loggers, so without a root handler the
# retention sweep's INFO lines never reach the console.
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run the retention sweep in the background for the life of the app."""
    sweep_task = asyncio.create_task(sweep_loop())
    yield
    sweep_task.cancel()
    try:
        await sweep_task
    except asyncio.CancelledError:
        pass


# redirect_slashes=False: behind CloudFront + ALB, FastAPI's trailing-slash
# redirects would be built from the ALB's Host header and send browsers off
# the CloudFront domain.
app = FastAPI(title="Request Bin", lifespan=lifespan, redirect_slashes=False)

# Only needed for local development without the Vite proxy. Through CloudFront
# the frontend and API share one origin, so browsers don't apply CORS.
frontend_origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins.split(",") if origin.strip()],
    allow_methods=["*"],
    allow_headers=["Owner-Token"],
)


@app.get("/api/health")
def health():
    """ALB target group health check. Kept cheap: no database access."""
    return {"status": "ok", "host": socket.gethostname()}


# CloudFront only routes /api/* to the ALB, so every backend route lives under /api.
# bins must come before catch_all, whose path-parameter route would otherwise swallow it.
# catch_all gets its own /hooks segment so unmatched /api paths return 404 instead of
# failing UUID validation.
app.include_router(bins.router, prefix="/api")          # /api/buckets/...
app.include_router(websocket.router, prefix="/api")     # /api/ws/{bucket_id}
app.include_router(catch_all.router, prefix="/api/hooks")  # /api/hooks/{public_id}/...