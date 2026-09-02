import os

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from routes import bins, catch_all, websocket

load_dotenv()

app = FastAPI(title="Request Bin")

allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# bins must come first -- catch_all's /{full_path:path} would otherwise swallow it.
app.include_router(bins.router)
app.include_router(websocket.router)
app.include_router(catch_all.router)